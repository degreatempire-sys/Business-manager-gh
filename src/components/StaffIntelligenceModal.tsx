import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Users,
  DollarSign,
  Calendar,
  RefreshCw,
  Clock,
  ArrowRight,
  Award,
  Zap,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Percent,
  Search,
  ShoppingBag,
  Package,
  Layers,
  BarChart3,
  CalendarDays,
  UserCheck,
} from 'lucide-react';
import { api } from '../services/api.js';
import type {
  Business,
  ManagementIntelligence,
  StaffPerformanceItem,
  ManagementRecommendation,
} from '../types/index.js';

interface StaffIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
  initialStaffId?: string;
}

export const StaffIntelligenceModal: React.FC<StaffIntelligenceModalProps> = ({
  isOpen,
  onClose,
  business,
  initialStaffId,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ManagementIntelligence | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Range and filter state
  const [range, setRange] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'operations' | 'velocity' | 'recommendations'>('leaderboard');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffPerformanceItem | null>(null);

  const currency = business?.currency || 'GH₵';

  const fetchIntelligence = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getStaffIntelligence({
        range,
        startDate: range === 'custom' ? startDate : undefined,
        endDate: range === 'custom' ? endDate : undefined,
      });
      setData(res);

      if (initialStaffId && res.staffPerformance) {
        const found = res.staffPerformance.find((s) => s.id === initialStaffId || s.staffId === initialStaffId);
        if (found) {
          setSelectedStaff(found);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to calculate staff performance and operations intelligence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchIntelligence();
    }
  }, [isOpen, range]);

  if (!isOpen) return null;

  const staffSummary = data?.staffSummary;
  const staffList = data?.staffPerformance || [];
  const hourly = data?.hourlyDistribution || [];
  const peak = data?.peakOperatingHours;
  const daysOfWeek = data?.dayOfWeekDistribution || [];
  const busiestDay = data?.busiestDay;
  const paymentMix = data?.paymentMethodMix || [];
  const debtVelocity = data?.debtVelocity;
  const recommendations = data?.recommendations || [];

  // Filter staff list
  const filteredStaff = staffList.filter((s) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q)) ||
      s.role.toLowerCase().includes(q)
    );
  });

  const maxRevenueHour = Math.max(...hourly.map((h) => h.totalRevenue), 1);
  const maxDayRevenue = Math.max(...daysOfWeek.map((d) => d.totalRevenue), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl my-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/30 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Staff Performance & Operations Intelligence
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Accra Time
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Authoritative staff attribution, rush hour peaks, and actionable shop management heuristics.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Range Selector */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
              <select
                aria-label="Select Intelligence Date Range"
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none pr-2 py-0.5 text-xs font-medium cursor-pointer"
              >
                <option value="today" className="bg-slate-900 text-white">Today</option>
                <option value="yesterday" className="bg-slate-900 text-white">Yesterday</option>
                <option value="this_week" className="bg-slate-900 text-white">This Week</option>
                <option value="last_week" className="bg-slate-900 text-white">Last Week</option>
                <option value="this_month" className="bg-slate-900 text-white">This Month</option>
                <option value="last_month" className="bg-slate-900 text-white">Last Month</option>
                <option value="all_time" className="bg-slate-900 text-white">All Time</option>
                <option value="custom" className="bg-slate-900 text-white">Custom Range</option>
              </select>
            </div>

            {range === 'custom' && (
              <div className="flex items-center space-x-1.5 text-xs">
                <input
                  type="date"
                  aria-label="Custom Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  aria-label="Custom End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                />
                <button
                  onClick={fetchIntelligence}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium"
                >
                  Apply
                </button>
              </div>
            )}

            <button
              onClick={fetchIntelligence}
              disabled={loading}
              title="Refresh Analytics"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              title="Close Modal"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Overview KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">Total Staff</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-bold text-white tracking-tight">
                  {loading ? '...' : staffSummary?.totalStaffCount || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  <span className="text-emerald-400 font-semibold">{staffSummary?.activeStaffCount || 0}</span> active in period
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">Total Sales</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-bold text-emerald-400 tracking-tight">
                  {loading ? '...' : `${currency} ${(staffSummary?.totalSalesValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {staffSummary?.totalTransactions || 0} orders
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">Units Sold</span>
                <Package className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-bold text-white tracking-tight">
                  {loading ? '...' : (staffSummary?.totalUnitsSold || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Avg {staffSummary?.activeStaffCount ? Math.round((staffSummary?.totalUnitsSold || 0) / staffSummary.activeStaffCount) : 0} / staff
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">Avg Order Value</span>
                <TrendingUp className="w-4 h-4 text-teal-400" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-bold text-teal-400 tracking-tight">
                  {loading ? '...' : `${currency} ${((staffSummary?.totalTransactions ?? 0) > 0 ? (staffSummary?.totalSalesValue || 0) / (staffSummary?.totalTransactions || 1) : 0).toFixed(2)}`}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {currency} {(staffSummary?.totalDiscountsGiven || 0).toFixed(2)} discounts
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">Cash Realization</span>
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-bold text-sky-400 tracking-tight">
                  {loading ? '...' : `${currency} ${(staffSummary?.totalCashCollected || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {currency} {(staffSummary?.totalCreditOriginated || 0).toFixed(2)} in credit
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium uppercase tracking-wider">Top Performer</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2">
                <div className="text-sm font-bold text-amber-400 truncate">
                  {loading ? '...' : staffSummary?.topPerformer?.name || 'None'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {staffSummary?.topPerformer ? `${currency} ${staffSummary.topPerformer.salesValue.toFixed(2)}` : 'No sales yet'}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTab === 'leaderboard'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Staff Leaderboard ({staffList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('operations')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTab === 'operations'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Peak Hours & Busy Days</span>
            </button>

            <button
              onClick={() => setActiveTab('velocity')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTab === 'velocity'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Debt & Payment Velocity</span>
            </button>

            <button
              onClick={() => setActiveTab('recommendations')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTab === 'recommendations'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Management Insights ({recommendations.length})</span>
            </button>
          </div>

          {/* TAB 1: STAFF LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search staff by name or role..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="text-xs text-slate-400">
                  Showing {filteredStaff.length} staff records ranked by period revenue
                </div>
              </div>

              {filteredStaff.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                  <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No staff sales recorded for this period</p>
                  <p className="text-xs text-slate-500 mt-1">Try selecting a broader date range or recording new sales at POS.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Rank</th>
                        <th className="py-3 px-4">Staff Member</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4 text-right">Orders</th>
                        <th className="py-3 px-4 text-right">Units Sold</th>
                        <th className="py-3 px-4 text-right">Total Revenue</th>
                        <th className="py-3 px-4 text-right">Avg Order</th>
                        <th className="py-3 px-4 text-right">Cash / Digital</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {filteredStaff.map((staff) => {
                        const isTop = staff.rank === 1 && staff.totalSalesValue > 0;
                        return (
                          <tr
                            key={staff.id}
                            className={`hover:bg-slate-800/40 transition-colors ${
                              isTop ? 'bg-amber-500/5' : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-bold">
                              {isTop ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black">
                                  🥇
                                </span>
                              ) : staff.rank === 2 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700/40 text-slate-300 font-bold">
                                  2
                                </span>
                              ) : staff.rank === 3 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-900/30 text-amber-600 font-bold">
                                  3
                                </span>
                              ) : (
                                <span className="text-slate-500 pl-2">#{staff.rank}</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white">{staff.fullName}</div>
                              <div className="text-[10px] text-slate-500">{staff.email}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                {staff.role === 'business_owner' ? 'Owner' : staff.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-white">
                              {staff.transactionCount}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-300">
                              {staff.unitsSold}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-400">
                              {currency} {staff.totalSalesValue.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right text-teal-400">
                              {currency} {staff.averageTransactionValue.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="text-emerald-400 font-medium">
                                {currency} {staff.cashCollected.toFixed(2)}
                              </div>
                              {staff.creditSalesAmount > 0 && (
                                <div className="text-[10px] text-amber-400">
                                  +{currency} {staff.creditSalesAmount.toFixed(2)} credit
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setSelectedStaff(staff)}
                                className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-colors text-[11px] font-medium inline-flex items-center space-x-1"
                              >
                                <span>Details</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PEAK HOURS & OPERATING DAYS */}
          {activeTab === 'operations' && (
            <div className="space-y-6">
              {/* Highlight Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-indigo-400 tracking-wider">Peak Rush Window</span>
                    <h3 className="text-base font-bold text-white mt-0.5">{peak?.peakHourLabel || 'N/A'}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {peak?.salesCount || 0} transactions totaling {currency} {(peak?.totalRevenue || 0).toFixed(2)} ({peak?.busiestTimeOfDay})
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-emerald-400 tracking-wider">Busiest Day of Week</span>
                    <h3 className="text-base font-bold text-white mt-0.5">{busiestDay?.dayName || 'N/A'}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {busiestDay?.salesCount || 0} sales generating {currency} {(busiestDay?.totalRevenue || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Staffing Recommendation</span>
                    <h3 className="text-xs font-bold text-slate-200 mt-0.5">Optimize Shift Schedules</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Schedule primary cashiers during {peak?.peakHourLabel || 'rush hours'} to reduce queue times and ensure speedy service.
                    </p>
                  </div>
                </div>
              </div>

              {/* 24-Hour Distribution Bar Visualizer */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    <span>24-Hour Hourly Sales Frequency (Africa/Accra)</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">Based on authoritative receipt timestamps</span>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-12 md:grid-cols-24 gap-1 pt-4 pb-2 items-end h-36">
                  {hourly.map((item) => {
                    const isPeak = item.hour === peak?.peakHour && item.salesCount > 0;
                    const heightPercent = Math.max(8, Math.round((item.totalRevenue / maxRevenueHour) * 100));
                    return (
                      <div key={item.hour} className="flex flex-col items-center h-full justify-end group relative">
                        <div
                          style={{ height: `${item.totalRevenue > 0 ? heightPercent : 4}%` }}
                          className={`w-full rounded-t transition-all ${
                            isPeak
                              ? 'bg-indigo-500 shadow-lg shadow-indigo-500/30'
                              : item.salesCount > 0
                              ? 'bg-slate-700 group-hover:bg-indigo-400'
                              : 'bg-slate-800/40'
                          }`}
                        />
                        <span className="text-[9px] text-slate-500 mt-1 truncate">
                          {item.hour % 3 === 0 ? item.label : ''}
                        </span>

                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-20 bg-slate-900 border border-slate-700 text-white rounded p-2 text-[10px] whitespace-nowrap shadow-xl">
                          <div className="font-bold text-indigo-300">{item.label}</div>
                          <div>Orders: {item.salesCount}</div>
                          <div>Revenue: {currency} {item.totalRevenue.toFixed(2)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day of the Week Distribution */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <CalendarDays className="w-4 h-4 text-emerald-400" />
                  <span>Day-of-Week Revenue Distribution</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                  {daysOfWeek.map((day) => {
                    const isBusiest = day.dayName === busiestDay?.dayName && day.totalRevenue > 0;
                    const widthPercent = Math.round((day.totalRevenue / maxDayRevenue) * 100);
                    return (
                      <div
                        key={day.dayName}
                        className={`p-3 rounded-lg border flex flex-col justify-between ${
                          isBusiest
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">{day.dayName.slice(0, 3)}</span>
                          {isBusiest && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                              Peak
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <div className="text-sm font-bold text-white">
                            {currency} {day.totalRevenue.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {day.salesCount} orders
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div
                              className={`h-full ${isBusiest ? 'bg-emerald-400' : 'bg-slate-600'}`}
                              style={{ width: `${widthPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEBT & PAYMENT VELOCITY */}
          {activeTab === 'velocity' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Method Distribution */}
                <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                    <span>Payment Method Breakdown</span>
                  </h3>

                  <div className="space-y-3">
                    {paymentMix.length === 0 ? (
                      <p className="text-xs text-slate-500">No payment records found.</p>
                    ) : (
                      paymentMix.map((pm) => (
                        <div key={pm.method} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-300">{pm.method}</span>
                            <span className="text-slate-400">
                              {currency} {pm.amount.toFixed(2)} ({pm.percentage}%) • {pm.count} orders
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                pm.method === 'Cash'
                                  ? 'bg-emerald-500'
                                  : pm.method === 'Mobile Money'
                                  ? 'bg-amber-500'
                                  : pm.method === 'Credit/Debt'
                                  ? 'bg-rose-500'
                                  : 'bg-indigo-500'
                              }`}
                              style={{ width: `${pm.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Debt Velocity Health */}
                <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                      <Percent className="w-4 h-4 text-emerald-400" />
                      <span>Credit Origination vs. Debt Collections</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Monitor whether credit extended is being recovered quickly enough to safeguard cash flow.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 my-3">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-medium">New Credit Originated</span>
                      <div className="text-base font-bold text-rose-400 mt-1">
                        {currency} {(debtVelocity?.debtOriginated || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-medium">Customer Debt Collected</span>
                      <div className="text-base font-bold text-emerald-400 mt-1">
                        {currency} {(debtVelocity?.debtCollected || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400">Net Credit Expansion/Recovery:</span>
                      <div className="font-bold text-sm text-white">
                        {(debtVelocity?.netDebtChange || 0) > 0 ? (
                          <span className="text-rose-400">+{currency} {(debtVelocity?.netDebtChange || 0).toFixed(2)} (Debt Growing)</span>
                        ) : (
                          <span className="text-emerald-400">-{currency} {Math.abs(debtVelocity?.netDebtChange || 0).toFixed(2)} (Debt Recovering)</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">Collection Velocity:</span>
                      <div className="font-bold text-indigo-400">
                        {debtVelocity?.collectionEfficiencyPercent || 100}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MANAGEMENT RECOMMENDATIONS */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Automated heuristics evaluating peak times, fast sellers, credit exposure, and cashier productivity.
              </div>

              {recommendations.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-slate-200">No operational warnings</p>
                  <p className="text-xs text-slate-500 mt-1">Shop operations, staffing, and credit health appear balanced.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.map((rec) => {
                    const isHigh = rec.impact === 'high';
                    const isWarning = rec.type === 'warning';
                    const isPraise = rec.type === 'praise';

                    return (
                      <div
                        key={rec.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between ${
                          isWarning
                            ? 'bg-rose-500/5 border-rose-500/30'
                            : isPraise
                            ? 'bg-amber-500/5 border-amber-500/30'
                            : 'bg-indigo-500/5 border-indigo-500/30'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                isWarning
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : isPraise
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-indigo-500/20 text-indigo-300'
                              }`}
                            >
                              {rec.category}
                            </span>
                            <span
                              className={`text-[10px] font-semibold ${
                                isHigh ? 'text-rose-400' : 'text-slate-400'
                              }`}
                            >
                              {rec.impact.toUpperCase()} IMPACT
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-white mt-2">{rec.title}</h4>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {rec.description}
                          </p>
                        </div>

                        {rec.actionLabel && (
                          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-end">
                            <span className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer">
                              <span>{rec.actionLabel}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Individual Staff Member Detail Modal / Drawer */}
        {selectedStaff && (
          <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-sm p-4 sm:p-6 flex flex-col overflow-y-auto animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedStaff.fullName}</h3>
                  <div className="text-xs text-slate-400">
                    {selectedStaff.email} • Role: <span className="text-slate-200 capitalize">{selectedStaff.role}</span> • Rank #{selectedStaff.rank}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Total Sales</span>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    {currency} {selectedStaff.totalSalesValue.toFixed(2)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Orders Completed</span>
                  <div className="text-lg font-bold text-white mt-1">
                    {selectedStaff.transactionCount}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Units Sold</span>
                  <div className="text-lg font-bold text-white mt-1">
                    {selectedStaff.unitsSold}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Avg Order Value</span>
                  <div className="text-lg font-bold text-teal-400 mt-1">
                    {currency} {selectedStaff.averageTransactionValue.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Top Products Sold By This Staff Member */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>Top Products Sold by {selectedStaff.fullName}</span>
                </h4>

                {selectedStaff.topProducts.length === 0 ? (
                  <p className="text-xs text-slate-500">No items sold in this period.</p>
                ) : (
                  <div className="divide-y divide-slate-800 text-xs">
                    {selectedStaff.topProducts.map((p) => (
                      <div key={p.productId} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-white">{p.productName}</span>
                          <div className="text-[11px] text-slate-400">{p.quantity} units sold</div>
                        </div>
                        <span className="font-bold text-emerald-400">
                          {currency} {p.revenue.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Methods Handled */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span>Payment Channels Handled</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {Object.entries(selectedStaff.paymentMethodBreakdown || {}).map(([method, stats]: [string, { count: number; amount: number }]) => (
                    <div key={method} className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">{method}</span>
                      <div className="font-bold text-white mt-1">
                        {currency} {stats.amount.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{stats.count} transactions</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedStaff(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Back to Leaderboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
