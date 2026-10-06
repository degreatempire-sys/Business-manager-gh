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
  ShieldAlert,
  MessageSquare,
  Award,
  Zap,
  UserX,
  UserCheck,
  CreditCard,
  Percent,
  Search,
} from 'lucide-react';
import { api } from '../services/api.js';
import { formatAccraDate, formatAccraDateTime, getAccraToday } from '../utils/date.js';
import { formatGhanaPhone } from '../utils/whatsapp.js';
import type {
  Business,
  CustomerIntelligence,
  CustomerIntelligenceItem,
} from '../types/index.js';

interface CustomerIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
  onSelectCustomer?: (customerId: string) => void;
}

export const CustomerIntelligenceModal: React.FC<CustomerIntelligenceModalProps> = ({
  isOpen,
  onClose,
  business,
  onSelectCustomer,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CustomerIntelligence | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter & Range State
  const [range, setRange] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'top' | 'frequent' | 'inactive' | 'debtors' | 'segments'>('top');
  const [searchFilter, setSearchFilter] = useState('');

  const currency = business?.currency || 'GH₵';

  const fetchIntelligence = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getCustomerIntelligence({
        range,
        startDate: range === 'custom' ? startDate : undefined,
        endDate: range === 'custom' ? endDate : undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate customer intelligence.');
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

  const summary = data?.summary;
  const segments = data?.segmentsSummary;

  // Filtered lists based on in-modal search
  const filterList = (items: CustomerIntelligenceItem[] = []) => {
    if (!searchFilter.trim()) return items;
    const q = searchFilter.toLowerCase();
    return items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  };

  const handleWhatsAppFollowUp = (customer: CustomerIntelligenceItem, type: 'friendly' | 'debt') => {
    const cleanPhone = formatGhanaPhone(customer.phone);
    if (!cleanPhone) return;

    let text = '';
    const bizName = business?.name || 'our business';
    if (type === 'debt') {
      text = `Hello ${customer.name}, this is a gentle reminder from ${bizName} regarding your outstanding balance of ${currency} ${customer.currentDebt.toFixed(
        2
      )}. Kindly reach out to arrange settlement. Thank you!`;
    } else {
      text = `Hello ${customer.name}, thank you for choosing ${bizName}! We appreciate your patronage and hope to serve you again soon. Let us know if you need anything!`;
    }
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/70">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Customer & Relationship Intelligence
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950/80 border border-emerald-800 text-emerald-400 uppercase tracking-wider">
                  Live Insights
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Authoritative segmentation, purchase behavior, credit exposure & inactivity tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchIntelligence}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
              title="Refresh intelligence"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] mr-1">
              Time Period:
            </span>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'This Week' },
              { id: 'last_week', label: 'Last Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'all_time', label: 'All Time' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setRange(p.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  range === p.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
              />
              <button
                onClick={fetchIntelligence}
                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
              >
                Apply
              </button>
            </div>
          )}

          {data?.dateRange && (
            <span className="text-[11px] text-slate-400 font-mono">
              Ghana Window: <strong className="text-slate-300">{data.dateRange.label}</strong> (
              {data.dateRange.fromDate} to {data.dateRange.toDate})
            </span>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {error && (
            <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-rose-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-slate-500 space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto text-emerald-400" />
              <p className="text-xs font-semibold">Aggregating customer behavior and relationship analytics...</p>
            </div>
          ) : data ? (
            <>
              {/* Executive Metrics Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Total Directory
                  </span>
                  <p className="text-lg font-black text-white font-mono mt-1">
                    {summary?.totalCustomers || 0}
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Active profiles</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
                    Active (30 Days)
                  </span>
                  <p className="text-lg font-black text-emerald-400 font-mono mt-1">
                    {summary?.activeCustomersCount || 0}
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Purchased recently</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider block">
                    New Customers
                  </span>
                  <p className="text-lg font-black text-blue-400 font-mono mt-1">
                    {summary?.newCustomersCount || 0}
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">First purchase in period</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-purple-400 uppercase font-bold tracking-wider block">
                    Frequent (≥3 Sales)
                  </span>
                  <p className="text-lg font-black text-purple-400 font-mono mt-1">
                    {summary?.frequentCustomersCount || 0}
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">High repeat loyalty</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block">
                    Inactive (&gt;30 Days)
                  </span>
                  <p className="text-lg font-black text-amber-400 font-mono mt-1">
                    {summary?.inactiveCustomersCount || 0}
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Need re-engagement</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider block">
                    Total Debt Balance
                  </span>
                  <p className="text-lg font-black text-rose-400 font-mono mt-1">
                    {currency} {(summary?.totalCustomerDebt || 0).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {summary?.debtorsCount || 0} debtors
                  </span>
                </div>
              </div>

              {/* Credit Risk & Exposure Summary Banner */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/80 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Credit Risk & Exposure Health</span>
                    <span className="text-slate-400 text-[11px]">
                      Total Limit Exposure: <strong className="text-slate-300 font-mono">{currency} {(summary?.totalCreditLimitExposure || 0).toFixed(2)}</strong> | Utilization: <strong className="text-amber-400 font-mono">{(summary?.creditUtilizationPercent || 0).toFixed(1)}%</strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-slate-400">Near Limit (≥80%):</span>
                    <strong className="text-white font-mono">{summary?.customersNearCreditLimit || 0}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span className="text-slate-400">Exceeding Limit:</span>
                    <strong className="text-rose-400 font-mono">{summary?.customersExceedingCreditLimit || 0}</strong>
                  </div>
                  {summary?.oldestOutstandingDebtDate && (
                    <div className="text-slate-400 font-mono">
                      Oldest Unpaid Debt: <strong className="text-slate-300">{formatAccraDate(summary.oldestOutstandingDebtDate)}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Segmentation Pills */}
              {segments && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">Distribution:</span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">
                    New: <strong className="text-white">{segments.newCount}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs font-semibold">
                    Active: <strong className="text-white">{segments.activeCount}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-purple-950/70 border border-purple-800/80 text-purple-300 text-xs font-semibold">
                    Frequent: <strong className="text-white">{segments.frequentCount}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-blue-950/70 border border-blue-800/80 text-blue-300 text-xs font-semibold">
                    High Value: <strong className="text-white">{segments.highValueCount}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-950/70 border border-amber-800/80 text-amber-300 text-xs font-semibold">
                    Inactive: <strong className="text-white">{segments.inactiveCount}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs font-semibold">
                    Debtors: <strong className="text-white">{segments.debtorCount}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-red-950/90 border border-red-800 text-red-300 text-xs font-semibold">
                    Credit Risk: <strong className="text-white">{segments.creditRiskCount}</strong>
                  </span>
                </div>
              )}

              {/* Navigation Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pt-2 pb-1">
                <div className="flex items-center gap-3 text-xs font-bold">
                  <button
                    onClick={() => setActiveTab('top')}
                    className={`pb-2 transition border-b-2 ${
                      activeTab === 'top'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    Top Customers by Spend ({data.topCustomers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('frequent')}
                    className={`pb-2 transition border-b-2 ${
                      activeTab === 'frequent'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    Frequent Buyers ({data.frequentCustomers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('inactive')}
                    className={`pb-2 transition border-b-2 ${
                      activeTab === 'inactive'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    Inactive Follow-ups ({data.inactiveCustomers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('debtors')}
                    className={`pb-2 transition border-b-2 ${
                      activeTab === 'debtors'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    Credit Exposure ({data.debtorCustomers.length})
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search in table..."
                    className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 w-44"
                  />
                </div>
              </div>

              {/* Tab 1: Top Customers */}
              {activeTab === 'top' && (
                <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                        <th className="py-3 px-4 font-bold">Rank & Customer</th>
                        <th className="py-3 px-4 font-bold">Phone Number</th>
                        <th className="py-3 px-4 font-bold text-right">Period Purchases</th>
                        <th className="py-3 px-4 font-bold text-right">Orders</th>
                        <th className="py-3 px-4 font-bold text-right">Avg Order (ATV)</th>
                        <th className="py-3 px-4 font-bold">Last Purchase</th>
                        <th className="py-3 px-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filterList(data.topCustomers).length > 0 ? (
                        filterList(data.topCustomers).map((c, idx) => (
                          <tr key={c.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${
                                    idx === 0
                                      ? 'bg-amber-400 text-slate-950'
                                      : idx === 1
                                      ? 'bg-slate-300 text-slate-950'
                                      : idx === 2
                                      ? 'bg-amber-700 text-white'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <div>
                                  <strong className="text-white block">{c.name}</strong>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    Segment: {c.segment}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">{c.phone}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                              {currency} {(c.periodPurchases || c.totalPurchases).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-300">
                              {c.periodTxCount || c.transactionCount}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-300">
                              {currency} {c.averageTransactionValue.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {c.lastPurchaseDate ? formatAccraDate(c.lastPurchaseDate) : 'Never'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    onClose();
                                    onSelectCustomer?.(c.id);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px]"
                                >
                                  Profile
                                </button>
                                <button
                                  onClick={() => handleWhatsAppFollowUp(c, 'friendly')}
                                  className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 hover:bg-emerald-900"
                                  title="Send WhatsApp greeting"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            No top customer records found for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Frequent Customers */}
              {activeTab === 'frequent' && (
                <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                        <th className="py-3 px-4 font-bold">Rank & Customer</th>
                        <th className="py-3 px-4 font-bold">Phone Number</th>
                        <th className="py-3 px-4 font-bold text-right">Lifetime Orders</th>
                        <th className="py-3 px-4 font-bold text-right">Lifetime Spend</th>
                        <th className="py-3 px-4 font-bold text-right">Average Order</th>
                        <th className="py-3 px-4 font-bold">Last Active</th>
                        <th className="py-3 px-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filterList(data.frequentCustomers).length > 0 ? (
                        filterList(data.frequentCustomers).map((c, idx) => (
                          <tr key={c.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-purple-950 border border-purple-800 text-purple-300 flex items-center justify-center font-black text-[10px]">
                                  {idx + 1}
                                </span>
                                <div>
                                  <strong className="text-white block">{c.name}</strong>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {c.daysSinceLastPurchase !== undefined
                                      ? `${c.daysSinceLastPurchase} days ago`
                                      : 'Recently'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">{c.phone}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-purple-400">
                              {c.transactionCount}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                              {currency} {c.totalPurchases.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-300">
                              {currency} {c.averageTransactionValue.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {c.lastPurchaseDate ? formatAccraDate(c.lastPurchaseDate) : 'Never'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    onClose();
                                    onSelectCustomer?.(c.id);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px]"
                                >
                                  Profile
                                </button>
                                <button
                                  onClick={() => handleWhatsAppFollowUp(c, 'friendly')}
                                  className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 hover:bg-emerald-900"
                                  title="Send WhatsApp greeting"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            No frequent customer records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Inactive Customers */}
              {activeTab === 'inactive' && (
                <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                        <th className="py-3 px-4 font-bold">Customer</th>
                        <th className="py-3 px-4 font-bold">Phone Number</th>
                        <th className="py-3 px-4 font-bold text-center">Inactivity Duration</th>
                        <th className="py-3 px-4 font-bold">Last Purchase Date</th>
                        <th className="py-3 px-4 font-bold text-right">Past Spend</th>
                        <th className="py-3 px-4 font-bold text-right">Outstanding Debt</th>
                        <th className="py-3 px-4 font-bold text-right">Re-engage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filterList(data.inactiveCustomers).length > 0 ? (
                        filterList(data.inactiveCustomers).map((c) => (
                          <tr key={c.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4">
                              <strong className="text-white block">{c.name}</strong>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Past Orders: {c.transactionCount}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">{c.phone}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 border border-amber-800 text-amber-400">
                                {c.daysSinceLastPurchase} days inactive
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {c.lastPurchaseDate ? formatAccraDate(c.lastPurchaseDate) : 'No purchase'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-300">
                              {currency} {c.totalPurchases.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                              {c.currentDebt > 0 ? `${currency} ${c.currentDebt.toFixed(2)}` : 'None'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleWhatsAppFollowUp(c, c.currentDebt > 0 ? 'debt' : 'friendly')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 hover:bg-emerald-800 transition inline-flex items-center gap-1.5 text-xs font-semibold"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>WhatsApp Check-In</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            No inactive customers found. All customers have purchased within 30 days!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 4: Debt & Credit Exposure */}
              {activeTab === 'debtors' && (
                <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                        <th className="py-3 px-4 font-bold">Debtor</th>
                        <th className="py-3 px-4 font-bold">Phone Number</th>
                        <th className="py-3 px-4 font-bold text-right">Current Debt</th>
                        <th className="py-3 px-4 font-bold text-right">Credit Limit</th>
                        <th className="py-3 px-4 font-bold text-right">Available Credit</th>
                        <th className="py-3 px-4 font-bold text-center">Limit Status</th>
                        <th className="py-3 px-4 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filterList(data.debtorCustomers).length > 0 ? (
                        filterList(data.debtorCustomers).map((c) => {
                          const isNearLimit =
                            c.creditLimit > 0 &&
                            c.currentDebt >= 0.8 * c.creditLimit &&
                            c.currentDebt <= c.creditLimit;
                          const isExceeding = c.creditLimit > 0 && c.currentDebt > c.creditLimit;

                          return (
                            <tr key={c.id} className="hover:bg-slate-800/40 transition">
                              <td className="py-3 px-4">
                                <strong className="text-white block">{c.name}</strong>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  Orders: {c.transactionCount}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-400">{c.phone}</td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                                {currency} {c.currentDebt.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-300">
                                {c.creditLimit > 0 ? `${currency} ${c.creditLimit.toFixed(2)}` : 'None'}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-emerald-400">
                                {c.creditLimit > 0
                                  ? `${currency} ${c.availableCredit.toFixed(2)}`
                                  : 'Unlimited'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {isExceeding ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 border border-rose-800 text-rose-400">
                                    Limit Exceeded
                                  </span>
                                ) : isNearLimit ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 border border-amber-800 text-amber-400">
                                    Near Limit (≥80%)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                                    Normal
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      onClose();
                                      onSelectCustomer?.(c.id);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px]"
                                  >
                                    Statement
                                  </button>
                                  <button
                                    onClick={() => handleWhatsAppFollowUp(c, 'debt')}
                                    className="p-1.5 rounded-lg bg-amber-950 border border-amber-800 text-amber-400 hover:bg-amber-900"
                                    title="Send debt reminder"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            Zero outstanding debtors recorded in directory!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Server-authoritative analytics calculated in Africa/Accra timezone</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
