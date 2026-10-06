import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Store,
  Users,
  CreditCard,
  Activity,
  RefreshCw,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  X,
  Building,
  DollarSign,
  Calendar,
  AlertCircle,
  Smartphone,
  MapPin,
  Mail,
  UserCheck,
  TrendingUp,
  Layers,
  ArrowRight,
  HelpCircle,
  Sparkles,
  Settings2,
  Check,
  Info,
} from 'lucide-react';
import { api } from '../services/api.js';
import type {
  AdminDashboardData,
  AdminBusinessItem,
  AdminSubscriptionItem,
  SubscriptionPayment,
  AdminActivityItem,
  User,
} from '../types/index.js';

interface AdminViewProps {
  currentUser: User | null;
  onNavigateToBusiness?: (businessId: string) => void;
  onReturnToDashboard?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ currentUser, onReturnToDashboard }) => {
  // Navigation tabs within Master Admin
  const [activeTab, setActiveTab] = useState<'overview' | 'businesses' | 'subscriptions' | 'payments' | 'activity'>('overview');

  // Master Admin authorization check
  const isMasterAdmin =
    Boolean(currentUser) &&
    (currentUser?.role === 'admin' ||
      currentUser?.role === 'master_admin' ||
      currentUser?.id === 'usr_admin_master' ||
      currentUser?.email?.toLowerCase() === 'admin@businessmanagergh.com');

  // Real Database States
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [businesses, setBusinesses] = useState<AdminBusinessItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionItem[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [activityLogs, setActivityLogs] = useState<AdminActivityItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Selected Business for Detail Modal (Safe View)
  const [selectedBusiness, setSelectedBusiness] = useState<AdminBusinessItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Filter & Search states for Businesses tab
  const [bizSearch, setBizSearch] = useState('');
  const [bizPlanFilter, setBizPlanFilter] = useState('ALL');
  const [bizStatusFilter, setBizStatusFilter] = useState('ALL');

  // Filter & Search states for Subscriptions tab
  const [subSearch, setSubSearch] = useState('');
  const [subPlanFilter, setSubPlanFilter] = useState('ALL');
  const [subStatusFilter, setSubStatusFilter] = useState('ALL');

  // Selected Subscription for View Detail Modal
  const [selectedSub, setSelectedSub] = useState<AdminSubscriptionItem | null>(null);
  const [subDetailModalOpen, setSubDetailModalOpen] = useState(false);

  // Change Plan Modal State
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);
  const [subToChangePlan, setSubToChangePlan] = useState<AdminSubscriptionItem | null>(null);
  const [newPlanSelected, setNewPlanSelected] = useState<'free' | 'starter' | 'business'>('free');

  // Change Status Modal State
  const [changeStatusModalOpen, setChangeStatusModalOpen] = useState(false);
  const [subToChangeStatus, setSubToChangeStatus] = useState<AdminSubscriptionItem | null>(null);
  const [newStatusSelected, setNewStatusSelected] = useState<string>('active');

  const [subActionLoading, setSubActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter for Activity tab
  const [activitySearch, setActivitySearch] = useState('');
  const [activityActionFilter, setActivityActionFilter] = useState('ALL');

  // Filter & Search states for Payments & Revenue tab
  const [paySearch, setPaySearch] = useState('');
  const [payStatusFilter, setPayStatusFilter] = useState('ALL');
  const [payPlanFilter, setPayPlanFilter] = useState('ALL');

  const fetchAdminData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [dash, bizList, subList, payList, logs] = await Promise.all([
        api.getAdminDashboard(),
        api.getAdminBusinesses(),
        api.getAdminSubscriptions(),
        api.getAdminPayments(),
        api.getAdminActivity(),
      ]);

      setDashboardData(dash);
      setBusinesses(bizList);
      setSubscriptions(subList);
      setPayments(payList);
      setActivityLogs(logs);
    } catch (err: any) {
      console.error('Failed to load Master Admin platform data:', err);
      setError(err.message || 'Failed to load platform administration data. Access may be restricted.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isMasterAdmin) {
      fetchAdminData();
    }
  }, [isMasterAdmin]);

  // Format Ghana date cleanly e.g. "01 Sept 2026"
  const formatDateGH = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Format Ghana DateTime cleanly
  const formatDateTimeGH = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Filtered Businesses
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      const matchesSearch =
        !bizSearch.trim() ||
        b.name.toLowerCase().includes(bizSearch.toLowerCase()) ||
        b.ownerName.toLowerCase().includes(bizSearch.toLowerCase()) ||
        b.ownerEmail.toLowerCase().includes(bizSearch.toLowerCase()) ||
        b.phone.toLowerCase().includes(bizSearch.toLowerCase()) ||
        b.location.toLowerCase().includes(bizSearch.toLowerCase()) ||
        b.type.toLowerCase().includes(bizSearch.toLowerCase());

      const matchesPlan =
        bizPlanFilter === 'ALL' ||
        b.plan.toUpperCase() === bizPlanFilter.toUpperCase();

      const matchesStatus =
        bizStatusFilter === 'ALL' ||
        b.status.toUpperCase() === bizStatusFilter.toUpperCase();

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [businesses, bizSearch, bizPlanFilter, bizStatusFilter]);

  // Subscriptions Summary Metrics
  const subSummary = useMemo(() => {
    const total = subscriptions.length;
    const active = subscriptions.filter((s) => s.status.toLowerCase() === 'active').length;
    const free = subscriptions.filter((s) => s.plan.toLowerCase() === 'free').length;
    const starter = subscriptions.filter((s) => s.plan.toLowerCase() === 'starter').length;
    const business = subscriptions.filter((s) => s.plan.toLowerCase() === 'business').length;
    const mrr = subscriptions.reduce((sum, s) => {
      if (s.status.toLowerCase() !== 'active') return sum;
      const p = s.plan.toLowerCase();
      if (p === 'starter') return sum + 49;
      if (p === 'business') return sum + 99;
      return sum;
    }, 0);
    return { total, active, free, starter, business, mrr };
  }, [subscriptions]);

  // Filtered Subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((s) => {
      const matchesSearch =
        !subSearch.trim() ||
        s.businessName.toLowerCase().includes(subSearch.toLowerCase()) ||
        s.ownerName.toLowerCase().includes(subSearch.toLowerCase()) ||
        s.ownerEmail.toLowerCase().includes(subSearch.toLowerCase()) ||
        (s.paymentReference && s.paymentReference.toLowerCase().includes(subSearch.toLowerCase())) ||
        (s.paymentProvider && s.paymentProvider.toLowerCase().includes(subSearch.toLowerCase()));

      const matchesPlan =
        subPlanFilter === 'ALL' ||
        s.plan.toUpperCase() === subPlanFilter.toUpperCase();

      const matchesStatus =
        subStatusFilter === 'ALL' ||
        s.status.toUpperCase() === subStatusFilter.toUpperCase();

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [subscriptions, subSearch, subPlanFilter, subStatusFilter]);

  // Payments Summary Metrics (Counting only verified successful transactions for revenue)
  const paymentsSummary = useMemo(() => {
    const totalTransactions = payments.length;
    const successfulPayments = payments.filter(
      (p) => p.status.toLowerCase() === 'successful' || p.status.toLowerCase() === 'success'
    );
    const successfulCount = successfulPayments.length;
    const failedCount = payments.filter(
      (p) => p.status.toLowerCase() === 'failed' || p.status.toLowerCase() === 'abandoned'
    ).length;
    const pendingCount = payments.filter((p) => p.status.toLowerCase() === 'pending').length;
    const totalCollected = successfulPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return { totalTransactions, successfulCount, failedCount, pendingCount, totalCollected };
  }, [payments]);

  // Filtered Payments (Sorted Newest First)
  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => {
        const searchLower = paySearch.trim().toLowerCase();
        const matchesSearch =
          !searchLower ||
          p.reference.toLowerCase().includes(searchLower) ||
          (p.businessName && p.businessName.toLowerCase().includes(searchLower)) ||
          (p.ownerName && p.ownerName.toLowerCase().includes(searchLower)) ||
          (p.ownerEmail && p.ownerEmail.toLowerCase().includes(searchLower)) ||
          (p.customerEmail && p.customerEmail.toLowerCase().includes(searchLower)) ||
          (p.paystackTransactionId && p.paystackTransactionId.toString().includes(searchLower));

        const matchesStatus =
          payStatusFilter === 'ALL' ||
          p.status.toUpperCase() === payStatusFilter.toUpperCase();

        const matchesPlan =
          payPlanFilter === 'ALL' ||
          p.plan.toUpperCase() === payPlanFilter.toUpperCase();

        return matchesSearch && matchesStatus && matchesPlan;
      })
      .sort((a, b) => {
        const dateA = new Date(a.paymentDate || a.createdAt || 0).getTime();
        const dateB = new Date(b.paymentDate || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
  }, [payments, paySearch, payStatusFilter, payPlanFilter]);

  const getPaymentStatusBadge = (statusStr: string) => {
    const s = statusStr.toLowerCase();
    if (s === 'successful' || s === 'success') {
      return (
        <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 text-emerald-400 text-[10px] font-bold border border-emerald-800/60 inline-flex items-center space-x-1 shadow-sm">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Successful</span>
        </span>
      );
    }
    if (s === 'failed') {
      return (
        <span className="px-2.5 py-1 rounded-full bg-rose-950/90 text-rose-300 text-[10px] font-bold border border-rose-800/60 inline-flex items-center space-x-1 shadow-sm">
          <AlertCircle className="w-3 h-3 text-rose-400" />
          <span>Failed</span>
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span className="px-2.5 py-1 rounded-full bg-amber-950/90 text-amber-300 text-[10px] font-bold border border-amber-800/60 inline-flex items-center space-x-1 shadow-sm">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>Pending</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700 inline-flex items-center space-x-1">
        <span>{statusStr}</span>
      </span>
    );
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Subscription Action Handlers
  const handleOpenChangePlan = (sub: AdminSubscriptionItem) => {
    setSubToChangePlan(sub);
    const rawPlan = sub.plan.toLowerCase();
    const validPlan = rawPlan === 'starter' || rawPlan === 'business' ? rawPlan : 'free';
    setNewPlanSelected(validPlan as any);
    setChangePlanModalOpen(true);
  };

  const handleSaveChangePlan = async () => {
    if (!subToChangePlan) return;
    setSubActionLoading(true);
    try {
      const res = await api.updateAdminSubscriptionPlan(subToChangePlan.id, newPlanSelected);
      setToastMessage(res.message || `Plan successfully updated to ${newPlanSelected.toUpperCase()}`);
      setChangePlanModalOpen(false);
      if (subDetailModalOpen && selectedSub?.id === subToChangePlan.id) {
        setSelectedSub({
          ...selectedSub,
          plan: newPlanSelected,
          amount: newPlanSelected === 'starter' ? 49 : newPlanSelected === 'business' ? 99 : 0,
          planPrice: newPlanSelected === 'starter' ? 49 : newPlanSelected === 'business' ? 99 : 0,
          paymentProvider: 'manual_admin',
        });
      }
      await fetchAdminData();
    } catch (err: any) {
      console.error('Failed to change plan:', err);
      alert(err.message || 'Failed to update subscription plan.');
    } finally {
      setSubActionLoading(false);
    }
  };

  const handleOpenChangeStatus = (sub: AdminSubscriptionItem) => {
    setSubToChangeStatus(sub);
    setNewStatusSelected(sub.status.toLowerCase());
    setChangeStatusModalOpen(true);
  };

  const handleSaveChangeStatus = async () => {
    if (!subToChangeStatus) return;
    setSubActionLoading(true);
    try {
      const res = await api.updateAdminSubscriptionStatus(subToChangeStatus.id, newStatusSelected);
      setToastMessage(res.message || `Status successfully updated to ${newStatusSelected.toUpperCase()}`);
      setChangeStatusModalOpen(false);
      if (subDetailModalOpen && selectedSub?.id === subToChangeStatus.id) {
        setSelectedSub({
          ...selectedSub,
          status: newStatusSelected,
        });
      }
      await fetchAdminData();
    } catch (err: any) {
      console.error('Failed to change status:', err);
      alert(err.message || 'Failed to update subscription status.');
    } finally {
      setSubActionLoading(false);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active') {
      return (
        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 text-[10px] font-black uppercase tracking-wider">
          Active
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span className="px-2.5 py-0.5 rounded-lg bg-amber-950/90 text-amber-300 border border-amber-700/60 text-[10px] font-black uppercase tracking-wider">
          Pending
        </span>
      );
    }
    if (s === 'past_due') {
      return (
        <span className="px-2.5 py-0.5 rounded-lg bg-orange-950/90 text-orange-300 border border-orange-700/60 text-[10px] font-black uppercase tracking-wider">
          Past Due
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="px-2.5 py-0.5 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800/60 text-[10px] font-black uppercase tracking-wider">
          Cancelled
        </span>
      );
    }
    if (s === 'expired') {
      return (
        <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-black uppercase tracking-wider">
          Expired
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold uppercase">
        {status}
      </span>
    );
  };

  // Filtered Activity Logs
  const filteredActivityLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      const matchesSearch =
        !activitySearch.trim() ||
        log.details.toLowerCase().includes(activitySearch.toLowerCase()) ||
        log.userName.toLowerCase().includes(activitySearch.toLowerCase()) ||
        (log.businessName && log.businessName.toLowerCase().includes(activitySearch.toLowerCase())) ||
        log.action.toLowerCase().includes(activitySearch.toLowerCase());

      const matchesAction =
        activityActionFilter === 'ALL' ||
        log.action.toLowerCase() === activityActionFilter.toLowerCase();

      return matchesSearch && matchesAction;
    });
  }, [activityLogs, activitySearch, activityActionFilter]);

  // Action Badge Helper
  const getActionBadge = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('login')) {
      return <span className="px-2 py-0.5 rounded-md bg-sky-950/80 text-sky-400 border border-sky-800/60 font-semibold text-[10px]">Login</span>;
    }
    if (act.includes('register') || act.includes('create')) {
      return <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold text-[10px]">Registration</span>;
    }
    if (act.includes('sale')) {
      return <span className="px-2 py-0.5 rounded-md bg-teal-950/80 text-teal-400 border border-teal-800/60 font-semibold text-[10px]">POS Sale</span>;
    }
    if (act.includes('subscription') || act.includes('upgrade') || act.includes('plan')) {
      return <span className="px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-400 border border-amber-800/60 font-semibold text-[10px]">Subscription</span>;
    }
    if (act.includes('payment')) {
      return <span className="px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-400 border border-purple-800/60 font-semibold text-[10px]">Payment</span>;
    }
    return <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold text-[10px]">{action}</span>;
  };

  // Plan Badge Helper
  const getPlanBadge = (plan: string) => {
    const p = plan.toUpperCase();
    if (p === 'BUSINESS') {
      return (
        <span className="px-2.5 py-0.5 rounded-lg bg-teal-950/90 text-teal-300 border border-teal-700/60 text-[11px] font-black tracking-wide">
          BUSINESS
        </span>
      );
    }
    if (p === 'STARTER') {
      return (
        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 text-[11px] font-black tracking-wide">
          STARTER
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 text-[11px] font-bold tracking-wide">
        FREE
      </span>
    );
  };

  // ----------------------------------------------------
  // SECURITY CHECK: 403 FORBIDDEN FOR NON-ADMIN USERS
  // ----------------------------------------------------
  if (!isMasterAdmin) {
    return (
      <div className="p-8 sm:p-16 max-w-lg mx-auto text-center space-y-5 animate-fadeIn">
        <div className="w-16 h-16 rounded-3xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto shadow-2xl shadow-rose-950/50">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <div className="inline-block px-3 py-1 rounded-full bg-rose-900/40 border border-rose-800 text-rose-300 font-mono text-xs font-bold">
            HTTP 403 Forbidden
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Restricted Platform Administrator Area
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Access to the Master Admin Dashboard is strictly restricted to the platform owner (<span className="text-slate-300 font-mono">admin@businessmanagergh.com</span>). Regular business accounts cannot view or modify platform administration data.
          </p>
        </div>
        {onReturnToDashboard && (
          <div className="pt-2">
            <button
              onClick={onReturnToDashboard}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-xs transition border border-slate-700 shadow-md inline-flex items-center space-x-2"
            >
              <span>Return to Business Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn font-sans">
      {/* 1. Master Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl">
        <div className="flex items-start sm:items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Business Manager <span className="text-emerald-400">GH</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/80 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                Platform Owner
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-300 mt-0.5">
              Platform Administration
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage businesses, subscriptions, users, payments and platform activity.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end sm:self-auto">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Logged In As</span>
            <span className="text-xs font-mono font-bold text-slate-300">{currentUser.email}</span>
          </div>
          <button
            onClick={() => fetchAdminData(true)}
            disabled={refreshing || loading}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition disabled:opacity-50 border border-slate-700 shadow-sm"
            title="Refresh database metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-2xl text-rose-300 text-xs flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <p className="flex-1">{error}</p>
          <button
            onClick={() => fetchAdminData(true)}
            className="px-2.5 py-1 rounded-lg bg-rose-900 hover:bg-rose-800 text-white font-bold text-[11px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-800/80 pb-2 overflow-x-auto text-xs no-scrollbar">
        {[
          { id: 'overview', label: 'Platform Overview', icon: TrendingUp },
          { id: 'businesses', label: `Businesses (${businesses.length})`, icon: Store },
          { id: 'subscriptions', label: `Subscriptions (${subscriptions.length})`, icon: Layers },
          { id: 'payments', label: `Payments / Revenue (${payments.length})`, icon: DollarSign },
          { id: 'activity', label: `Platform Activity (${activityLogs.length})`, icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-bold transition shrink-0 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Areas */}
      {loading ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-spin">
            <RefreshCw className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">
            Loading Real Platform Metrics...
          </p>
        </div>
      ) : (
        <>
          {/* ==================================================== */}
          {/* TAB 1: PLATFORM OVERVIEW (8 REAL SUMMARY CARDS) */}
          {/* ==================================================== */}
          {activeTab === 'overview' && dashboardData && (
            <div className="space-y-8 animate-fadeIn">
              {/* 8 Summary Cards */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                    Platform Metric Summary
                  </h2>
                  <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                    Real Database Records
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Total Businesses */}
                  <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">1. Total Businesses</span>
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                        <Store className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-white mt-2">
                      {dashboardData.totalBusinesses}
                    </p>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                      All registered merchant shops
                    </span>
                  </div>

                  {/* Card 2: Active Businesses */}
                  <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">2. Active Businesses</span>
                      <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-emerald-400 mt-2">
                      {dashboardData.activeBusinesses}
                    </p>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                      Currently active and operational
                    </span>
                  </div>

                  {/* Card 3: Free Plan */}
                  <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">3. Free Plan</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300">
                        GH₵0/mo
                      </span>
                    </div>
                    <p className="text-2xl font-black text-slate-200 mt-2">
                      {dashboardData.freePlanCount}
                    </p>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                      Standard free tier merchants
                    </span>
                  </div>

                  {/* Card 4: Starter Plan */}
                  <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">4. Starter Plan</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-800 text-[10px] font-bold text-emerald-300">
                        GH₵49/mo
                      </span>
                    </div>
                    <p className="text-2xl font-black text-emerald-400 mt-2">
                      {dashboardData.starterPlanCount}
                    </p>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                      Growing businesses
                    </span>
                  </div>

                  {/* Card 5: Business Plan */}
                  <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">5. Business Plan</span>
                      <span className="px-2 py-0.5 rounded-md bg-teal-950 border border-teal-800 text-[10px] font-bold text-teal-300">
                        GH₵99/mo
                      </span>
                    </div>
                    <p className="text-2xl font-black text-teal-400 mt-2">
                      {dashboardData.businessPlanCount}
                    </p>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                      Full enterprise merchants
                    </span>
                  </div>

                  {/* Card 6: Total Platform Revenue */}
                  <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">6. Total Platform Revenue</span>
                      <div className="w-8 h-8 rounded-xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-purple-400">
                        <DollarSign className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-white mt-2">
                      GH₵ {dashboardData.totalPlatformRevenue.toFixed(2)}
                    </p>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                      Real subscription collections
                    </span>
                  </div>

                  {/* Card 7: New Businesses This Month */}
                  <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">7. New Businesses This Month</span>
                      <div className="w-8 h-8 rounded-xl bg-amber-950/60 border border-amber-800/50 flex items-center justify-center text-amber-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-amber-400 mt-2">
                      {dashboardData.newBusinessesThisMonth}
                    </p>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                      Accra business time (This Month)
                    </span>
                  </div>

                  {/* Card 8: Active Subscriptions */}
                  <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">8. Active Subscriptions</span>
                      <div className="w-8 h-8 rounded-xl bg-sky-950/60 border border-sky-800/50 flex items-center justify-center text-sky-400">
                        <Layers className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-sky-400 mt-2">
                      {dashboardData.activeSubscriptions}
                    </p>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                      Active billing contracts
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 4: Recent Businesses */}
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Recent Businesses
                    </h3>
                    <p className="text-xs text-slate-400">
                      Latest registered merchants across Ghana
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('businesses')}
                    className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300 font-bold transition self-start sm:self-auto"
                  >
                    <span>View All Businesses</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400">
                        <th className="pb-3 pr-4">Business Name</th>
                        <th className="pb-3 pr-4">Owner Name</th>
                        <th className="pb-3 pr-4">Owner Email</th>
                        <th className="pb-3 pr-4">Category</th>
                        <th className="pb-3 pr-4">Location</th>
                        <th className="pb-3 pr-4">Plan</th>
                        <th className="pb-3 pr-4">Registration Date</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {dashboardData.recentBusinesses.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-850/50 transition">
                          <td className="py-3.5 pr-4 font-bold text-white">
                            {b.name}
                          </td>
                          <td className="py-3.5 pr-4 text-slate-300 font-medium">
                            {b.ownerName}
                          </td>
                          <td className="py-3.5 pr-4 text-slate-400 font-mono text-[11px]">
                            {b.ownerEmail}
                          </td>
                          <td className="py-3.5 pr-4 text-slate-300">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-[11px]">
                              {b.type}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-slate-400">
                            {b.location}
                          </td>
                          <td className="py-3.5 pr-4">
                            {getPlanBadge(b.plan)}
                          </td>
                          <td className="py-3.5 pr-4 text-slate-400 font-mono text-[11px]">
                            {formatDateGH(b.createdAt)}
                          </td>
                          <td className="py-3.5 pr-4">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 text-[10px] font-bold border border-emerald-800/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>{b.status}</span>
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedBusiness(b);
                                setDetailModalOpen(true);
                              }}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-xs font-bold transition border border-slate-700"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Business</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: BUSINESSES MANAGEMENT */}
          {/* ==================================================== */}
          {activeTab === 'businesses' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Registered Businesses ({businesses.length})
                    </h2>
                    <p className="text-xs text-slate-400">
                      Search and inspect merchant tenants across Ghana
                    </p>
                  </div>

                  {/* Filters & Search */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search */}
                    <div className="relative min-w-[200px] flex-1 sm:flex-none">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={bizSearch}
                        onChange={(e) => setBizSearch(e.target.value)}
                        placeholder="Search business, owner, phone..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition"
                      />
                      {bizSearch && (
                        <button
                          onClick={() => setBizSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Plan Filter */}
                    <select
                      value={bizPlanFilter}
                      onChange={(e) => setBizPlanFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ALL">All Plans</option>
                      <option value="FREE">Free Plan</option>
                      <option value="STARTER">Starter Plan</option>
                      <option value="BUSINESS">Business Plan</option>
                    </select>

                    {/* Status Filter */}
                    <select
                      value={bizStatusFilter}
                      onChange={(e) => setBizStatusFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ALL">All Status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                </div>

                {/* Businesses Table */}
                {filteredBusinesses.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 space-y-2">
                    <Store className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-xs font-semibold">No businesses match your filter criteria.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[800px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400">
                          <th className="pb-3 pr-4">Business Name & Category</th>
                          <th className="pb-3 pr-4">Owner Name & Email</th>
                          <th className="pb-3 pr-4">Phone / Location</th>
                          <th className="pb-3 pr-4">Current Plan</th>
                          <th className="pb-3 pr-4">Registered On</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredBusinesses.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-850/50 transition">
                            <td className="py-3.5 pr-4">
                              <p className="font-bold text-white text-sm">{b.name}</p>
                              <span className="text-[11px] text-slate-400">{b.type}</span>
                            </td>
                            <td className="py-3.5 pr-4">
                              <p className="font-medium text-slate-200">{b.ownerName}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{b.ownerEmail}</p>
                            </td>
                            <td className="py-3.5 pr-4">
                              <p className="text-slate-300 font-mono">{b.phone || 'N/A'}</p>
                              <p className="text-[11px] text-slate-400">{b.location}</p>
                            </td>
                            <td className="py-3.5 pr-4">
                              {getPlanBadge(b.plan)}
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                Status: {b.subscriptionStatus}
                              </span>
                            </td>
                            <td className="py-3.5 pr-4 text-slate-400 font-mono">
                              {formatDateGH(b.createdAt)}
                            </td>
                            <td className="py-3.5 pr-4">
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-950/90 text-emerald-400 text-[10px] font-bold border border-emerald-800/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>{b.status}</span>
                              </span>
                            </td>
                            <td className="py-3.5 text-right">
                              <button
                                onClick={() => {
                                  setSelectedBusiness(b);
                                  setDetailModalOpen(true);
                                }}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-xs font-bold transition border border-slate-700"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Business</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: SUBSCRIPTIONS MANAGEMENT */}
          {/* ==================================================== */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Summary Cards: 6 Key Metrics */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                    Subscription & Revenue Foundation
                  </h2>
                  <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                    Live Subscription Contracts
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Card 1: Total Subscriptions */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 block">Total Contracts</span>
                    <p className="text-xl font-black text-white">{subSummary.total}</p>
                    <span className="text-[10px] text-slate-500 block font-medium">All businesses</span>
                  </div>

                  {/* Card 2: Active Subscriptions */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-900/40 shadow-sm space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 block">Active Contracts</span>
                    <p className="text-xl font-black text-emerald-400">{subSummary.active}</p>
                    <span className="text-[10px] text-emerald-500/80 block font-medium">In good standing</span>
                  </div>

                  {/* Card 3: Free Plan */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 block">Free Tier</span>
                    <p className="text-xl font-black text-slate-200">{subSummary.free}</p>
                    <span className="text-[10px] text-slate-500 block font-medium">GH₵0 / month</span>
                  </div>

                  {/* Card 4: Starter Plan */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-900/40 shadow-sm space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 block">Starter Tier</span>
                    <p className="text-xl font-black text-emerald-400">{subSummary.starter}</p>
                    <span className="text-[10px] text-emerald-500/80 block font-medium">GH₵49 / month</span>
                  </div>

                  {/* Card 5: Business Plan */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-teal-900/40 shadow-sm space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 block">Business Tier</span>
                    <p className="text-xl font-black text-teal-400">{subSummary.business}</p>
                    <span className="text-[10px] text-teal-500/80 block font-medium">GH₵99 / month</span>
                  </div>

                  {/* Card 6: MRR */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-800/80 shadow-sm space-y-1 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40">
                    <span className="text-[11px] font-bold text-emerald-400 block">Estimated MRR</span>
                    <p className="text-xl font-black text-emerald-300 font-mono">
                      GH₵{subSummary.mrr.toFixed(2)}
                    </p>
                    <span className="text-[10px] text-slate-400 block font-medium">Active paid plans</span>
                  </div>
                </div>
              </div>

              {/* Plan Pricing Reference Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-black text-xs">
                        FREE TIER
                      </span>
                      <span className="text-sm font-bold text-white font-mono">GH₵0<span className="text-xs text-slate-500 font-normal">/mo</span></span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Single store, core POS & product catalog</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-900/40 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 font-black text-xs">
                        STARTER TIER
                      </span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">GH₵49<span className="text-xs text-slate-500 font-normal">/mo</span></span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Multi-device sync & advanced reporting</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-teal-900/40 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md bg-teal-950 text-teal-300 border border-teal-800 font-black text-xs">
                        BUSINESS TIER
                      </span>
                      <span className="text-sm font-bold text-teal-400 font-mono">GH₵99<span className="text-xs text-slate-500 font-normal">/mo</span></span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Unlimited inventory & multi-cashier teams</p>
                  </div>
                </div>
              </div>

              {/* Subscriptions Table Card */}
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
                {/* Search and Filters */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Merchant Subscriptions ({filteredSubscriptions.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Manage tenant tiers, renewal cycles, and administrative controls
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search Input */}
                    <div className="relative min-w-[200px] sm:min-w-[240px]">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search business, owner, ref..."
                        value={subSearch}
                        onChange={(e) => setSubSearch(e.target.value)}
                        className="w-full pl-8 pr-7 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                      />
                      {subSearch && (
                        <button
                          onClick={() => setSubSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Plan Filter */}
                    <select
                      value={subPlanFilter}
                      onChange={(e) => setSubPlanFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ALL">All Plans</option>
                      <option value="FREE">Free Plan (GH₵0)</option>
                      <option value="STARTER">Starter (GH₵49)</option>
                      <option value="BUSINESS">Business (GH₵99)</option>
                    </select>

                    {/* Status Filter */}
                    <select
                      value={subStatusFilter}
                      onChange={(e) => setSubStatusFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="PENDING">Pending</option>
                      <option value="PAST_DUE">Past Due</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  </div>
                </div>

                {/* Table or Empty State */}
                {filteredSubscriptions.length === 0 ? (
                  <div className="py-16 text-center max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                      <Layers className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-white">No subscription records match your filter.</h4>
                    <p className="text-xs text-slate-400">
                      Try clearing your search query or setting the plan and status filters to "All".
                    </p>
                    <button
                      onClick={() => {
                        setSubSearch('');
                        setSubPlanFilter('ALL');
                        setSubStatusFilter('ALL');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-400"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[980px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400">
                          <th className="pb-3 pr-4">Business</th>
                          <th className="pb-3 pr-4">Owner</th>
                          <th className="pb-3 pr-4">Current Plan</th>
                          <th className="pb-3 pr-4">Amount</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 pr-4">Start Date</th>
                          <th className="pb-3 pr-4">Next Billing Date</th>
                          <th className="pb-3 pr-4">Payment Reference</th>
                          <th className="pb-3 pr-4">Provider</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredSubscriptions.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-850/50 transition group">
                            {/* Business */}
                            <td className="py-3.5 pr-4 font-bold text-white">
                              <p className="text-slate-100 font-bold">{s.businessName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">ID: {s.businessId}</p>
                            </td>

                            {/* Owner */}
                            <td className="py-3.5 pr-4">
                              <p className="text-slate-300 font-medium">{s.ownerName}</p>
                              <p className="text-[11px] text-slate-500 font-mono">{s.ownerEmail}</p>
                            </td>

                            {/* Plan */}
                            <td className="py-3.5 pr-4">
                              {getPlanBadge(s.plan)}
                            </td>

                            {/* Amount */}
                            <td className="py-3.5 pr-4 font-mono font-bold text-white">
                              GH₵{Number(s.amount ?? s.planPrice ?? 0).toFixed(2)}
                              <span className="text-[10px] text-slate-500 font-normal block">/{s.interval || 'monthly'}</span>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 pr-4">
                              {getStatusBadge(s.status)}
                            </td>

                            {/* Start Date */}
                            <td className="py-3.5 pr-4 text-slate-400 font-mono">
                              {formatDateGH(s.startDate || s.startedAt)}
                            </td>

                            {/* Next Billing Date */}
                            <td className="py-3.5 pr-4 text-slate-400 font-mono">
                              {formatDateGH(s.nextBillingDate || s.expiresAt)}
                            </td>

                            {/* Payment Reference */}
                            <td className="py-3.5 pr-4">
                              <span className="font-mono text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                {s.paymentReference || 'none'}
                              </span>
                            </td>

                            {/* Provider */}
                            <td className="py-3.5 pr-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-950 text-slate-300 border border-slate-800">
                                {s.paymentProvider === 'manual_admin'
                                  ? 'Admin Manual'
                                  : s.paymentProvider === 'paystack'
                                  ? 'Paystack'
                                  : 'None'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                {/* View Details */}
                                <button
                                  onClick={() => {
                                    setSelectedSub(s);
                                    setSubDetailModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                  title="View Subscription Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {/* Change Plan */}
                                <button
                                  onClick={() => handleOpenChangePlan(s)}
                                  className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-[11px] font-bold transition flex items-center space-x-1"
                                  title="Change Plan (Admin Control)"
                                >
                                  <Sparkles className="w-3 h-3 text-emerald-400" />
                                  <span>Change Plan</span>
                                </button>

                                {/* Change Status */}
                                <button
                                  onClick={() => handleOpenChangeStatus(s)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                  title="Change Status (Suspend/Cancel/Activate)"
                                >
                                  <Settings2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: REVENUE / PAYMENTS */}
          {/* ==================================================== */}
          {activeTab === 'payments' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Payment Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Verified Revenue */}
                <div className="p-5 rounded-3xl bg-slate-900/90 border border-emerald-900/40 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Total Revenue Collected</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">
                    GH₵ {(dashboardData?.totalPlatformRevenue ?? paymentsSummary.totalCollected).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                    Verified Paystack subscription payments
                  </span>
                </div>

                {/* 2. Successful Payments */}
                <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Successful Payments</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-950/50 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-white mt-2">
                    {paymentsSummary.successfulCount}
                  </p>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                    Completed & fulfilled transactions
                  </span>
                </div>

                {/* 3. Failed / Unfulfilled */}
                <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Failed / Unfulfilled</span>
                    <div className="w-8 h-8 rounded-xl bg-rose-950/50 border border-rose-800/40 flex items-center justify-center text-rose-400">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-rose-300 mt-2">
                    {paymentsSummary.failedCount}
                  </p>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                    Unsuccessful or rejected attempts
                  </span>
                </div>

                {/* 4. Total Ledger Records */}
                <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Total Transaction Records</span>
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-white mt-2">
                    {paymentsSummary.totalTransactions}
                  </p>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                    Total recorded in database
                  </span>
                </div>
              </div>

              {/* Payments Ledger Container */}
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Subscription Payments & Revenue Ledger
                    </h3>
                    <p className="text-xs text-slate-400">
                      Real-time payment transactions recorded in platform database (Currency: GH₵ / GHS)
                    </p>
                  </div>
                  <button
                    onClick={() => fetchAdminData(true)}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center space-x-1.5 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh Ledger</span>
                  </button>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by reference, business name, owner, or email..."
                      value={paySearch}
                      onChange={(e) => setPaySearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                    {paySearch && (
                      <button
                        onClick={() => setPaySearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center space-x-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <select
                      value={payStatusFilter}
                      onChange={(e) => setPayStatusFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="SUCCESSFUL">Successful</option>
                      <option value="FAILED">Failed</option>
                      <option value="PENDING">Pending</option>
                    </select>

                    <select
                      value={payPlanFilter}
                      onChange={(e) => setPayPlanFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                    >
                      <option value="ALL">All Plans</option>
                      <option value="STARTER">Starter (GH₵49)</option>
                      <option value="BUSINESS">Business (GH₵99)</option>
                    </select>
                  </div>
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="py-16 text-center max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      {payments.length === 0 ? 'No subscription payments recorded yet.' : 'No transactions match filter.'}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {payments.length === 0
                        ? 'Merchant subscription payment records will automatically populate here when online payments (Paystack / Mobile Money) are processed.'
                        : 'Try adjusting your search query or status filter to view payment records.'}
                    </p>
                    {payments.length > 0 && (
                      <button
                        onClick={() => {
                          setPaySearch('');
                          setPayStatusFilter('ALL');
                          setPayPlanFilter('ALL');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-emerald-400 font-semibold transition"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[760px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="pb-3 pr-4">Transaction Reference</th>
                          <th className="pb-3 pr-4">Business & Owner</th>
                          <th className="pb-3 pr-4">Plan</th>
                          <th className="pb-3 pr-4">Amount</th>
                          <th className="pb-3 pr-4">Payment Status</th>
                          <th className="pb-3 pr-4">Payment Channel</th>
                          <th className="pb-3">Date & Time (Accra)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredPayments.map((p) => {
                          const isSuccess =
                            p.status.toLowerCase() === 'successful' ||
                            p.status.toLowerCase() === 'success';

                          return (
                            <tr key={p.id || p.reference} className="hover:bg-slate-850/50 transition">
                              {/* Reference */}
                              <td className="py-3.5 pr-4">
                                <div className="space-y-0.5">
                                  <p className="font-mono font-bold text-emerald-400 text-xs">
                                    {p.reference}
                                  </p>
                                  {p.paystackTransactionId && (
                                    <p className="text-[10px] text-slate-500 font-mono">
                                      Paystack ID: {p.paystackTransactionId}
                                    </p>
                                  )}
                                </div>
                              </td>

                              {/* Business & Owner */}
                              <td className="py-3.5 pr-4">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-white text-xs">{p.businessName}</p>
                                  <p className="text-[11px] text-slate-400">
                                    {p.ownerName} &bull; <span className="text-slate-500">{p.customerEmail || p.ownerEmail}</span>
                                  </p>
                                </div>
                              </td>

                              {/* Plan */}
                              <td className="py-3.5 pr-4">
                                {getPlanBadge(p.plan)}
                              </td>

                              {/* Amount */}
                              <td className="py-3.5 pr-4">
                                <div className="font-mono font-black text-white text-xs">
                                  GH₵ {Number(p.amount).toFixed(2)}
                                </div>
                                <span className="text-[10px] text-slate-500 uppercase">{p.currency || 'GHS'}</span>
                              </td>

                              {/* Status */}
                              <td className="py-3.5 pr-4">
                                {getPaymentStatusBadge(p.status)}
                              </td>

                              {/* Channel */}
                              <td className="py-3.5 pr-4 text-slate-300 font-mono text-[11px]">
                                <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px]">
                                  {p.provider ? p.provider.toUpperCase() : 'PAYSTACK'}
                                </span>
                              </td>

                              {/* Date */}
                              <td className="py-3.5 text-slate-300 font-mono text-[11px]">
                                {formatDateTimeGH(p.paymentDate || p.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 5: PLATFORM ACTIVITY (GLOBAL AUDIT TRAIL) */}
          {/* ==================================================== */}
          {activeTab === 'activity' && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Platform Activity Audit Trail ({filteredActivityLogs.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    System-wide platform registrations, logins, settings, and business events
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      placeholder="Search event logs..."
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {filteredActivityLogs.length === 0 ? (
                <div className="py-16 text-center text-slate-500 space-y-2">
                  <Activity className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs font-semibold">No platform activity records found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400">
                        <th className="pb-3 pr-4">Timestamp</th>
                        <th className="pb-3 pr-4">Event Type</th>
                        <th className="pb-3 pr-4">Business / Scope</th>
                        <th className="pb-3 pr-4">User</th>
                        <th className="pb-3 pr-4">Details</th>
                        <th className="pb-3">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredActivityLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-850/50 transition">
                          <td className="py-3 pr-4 text-slate-400 font-mono whitespace-nowrap text-[11px]">
                            {formatDateTimeGH(log.createdAt || log.timestamp)}
                          </td>
                          <td className="py-3 pr-4">
                            {getActionBadge(log.action)}
                          </td>
                          <td className="py-3 pr-4 font-medium text-slate-200">
                            {log.businessName || 'System'}
                          </td>
                          <td className="py-3 pr-4 text-slate-300 font-semibold">
                            {log.userName}
                          </td>
                          <td className="py-3 pr-4 text-slate-300 leading-relaxed max-w-xs">
                            {log.details}
                          </td>
                          <td className="py-3 text-slate-500 font-mono text-[11px]">
                            {log.ipAddress || '127.0.0.1'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ==================================================== */}
      {/* SAFE VIEW BUSINESS DETAILS MODAL (READ-ONLY) */}
      {/* ==================================================== */}
      {detailModalOpen && selectedBusiness && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    {selectedBusiness.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    ID: {selectedBusiness.id} • {selectedBusiness.type}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Read-Only Safety Notice */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center space-x-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Platform Tenant Inspection — Data is securely isolated. Read-only mode.</span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Business Info */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
                <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                  Business Overview
                </h4>
                <div>
                  <span className="text-slate-500 block">Category / Type:</span>
                  <span className="text-slate-200 font-semibold">{selectedBusiness.type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Location:</span>
                  <span className="text-slate-200 font-semibold">{selectedBusiness.location}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Business Phone:</span>
                  <span className="text-slate-200 font-mono font-semibold">{selectedBusiness.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Registration Date:</span>
                  <span className="text-slate-200 font-mono font-semibold">{formatDateGH(selectedBusiness.createdAt)}</span>
                </div>
              </div>

              {/* Owner Info */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
                <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                  Merchant Account Owner
                </h4>
                <div>
                  <span className="text-slate-500 block">Full Name:</span>
                  <span className="text-slate-200 font-semibold">{selectedBusiness.ownerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Email Address:</span>
                  <span className="text-slate-200 font-mono font-semibold">{selectedBusiness.ownerEmail}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Phone Number:</span>
                  <span className="text-slate-200 font-mono font-semibold">{selectedBusiness.ownerPhone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Owner User ID:</span>
                  <span className="text-slate-400 font-mono text-[10px]">{selectedBusiness.ownerId}</span>
                </div>
              </div>

              {/* Subscription Info */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
                <h4 className="font-bold text-teal-400 uppercase tracking-wider text-[11px]">
                  Subscription Plan
                </h4>
                <div className="flex items-center space-x-2">
                  {getPlanBadge(selectedBusiness.plan)}
                  <span className="text-slate-400 font-mono">
                    {selectedBusiness.plan.toUpperCase() === 'BUSINESS'
                      ? 'GH₵99/mo'
                      : selectedBusiness.plan.toUpperCase() === 'STARTER'
                      ? 'GH₵49/mo'
                      : 'GH₵0/mo (Free)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Subscription Status:</span>
                  <span className="text-emerald-400 font-semibold uppercase">{selectedBusiness.subscriptionStatus}</span>
                </div>
              </div>

              {/* Activity Volume */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
                <h4 className="font-bold text-teal-400 uppercase tracking-wider text-[11px]">
                  Store Utilization (Database Records)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Total Sales</span>
                    <span className="font-bold text-white text-sm">{selectedBusiness.totalSalesCount ?? 0}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Revenue Volume</span>
                    <span className="font-bold text-emerald-400 text-sm">GH₵{(selectedBusiness.totalSalesRevenue ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Products</span>
                    <span className="font-bold text-white text-sm">{selectedBusiness.totalProductsCount ?? 0}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Customers</span>
                    <span className="font-bold text-white text-sm">{selectedBusiness.totalCustomersCount ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: VIEW SUBSCRIPTION DETAILS */}
      {/* ==================================================== */}
      {subDetailModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    {selectedSub.businessName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Subscription ID: {selectedSub.id} • Tenant ID: {selectedSub.businessId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSubDetailModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Safety Notice */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center space-x-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Master Admin Subscription Inspector — Real subscription contract and billing parameters.</span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Tenant & Owner Info */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
                <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                  Tenant & Merchant Owner
                </h4>
                <div>
                  <span className="text-slate-500 block">Business Name:</span>
                  <span className="text-slate-200 font-semibold">{selectedSub.businessName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Owner Name:</span>
                  <span className="text-slate-200 font-semibold">{selectedSub.ownerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Owner Email:</span>
                  <span className="text-slate-200 font-mono font-semibold">{selectedSub.ownerEmail}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Business ID:</span>
                  <span className="text-slate-400 font-mono text-[10px]">{selectedSub.businessId}</span>
                </div>
              </div>

              {/* Plan & Contract Status */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
                <h4 className="font-bold text-teal-400 uppercase tracking-wider text-[11px]">
                  Plan & Contract Tier
                </h4>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">Tier:</span>
                  {getPlanBadge(selectedSub.plan)}
                </div>
                <div>
                  <span className="text-slate-500 block">Billing Amount:</span>
                  <span className="text-white font-mono font-bold text-sm">
                    GH₵{Number(selectedSub.amount ?? selectedSub.planPrice ?? 0).toFixed(2)}
                    <span className="text-xs text-slate-400 font-normal"> / {selectedSub.interval || 'monthly'}</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">Contract Status:</span>
                  {getStatusBadge(selectedSub.status)}
                </div>
                <div>
                  <span className="text-slate-500 block">Currency:</span>
                  <span className="text-slate-300 font-mono font-bold">{selectedSub.currency || 'GHS'}</span>
                </div>
              </div>

              {/* Timeline & Renewal Schedule */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
                <h4 className="font-bold text-sky-400 uppercase tracking-wider text-[11px]">
                  Billing Timeline (Accra Time)
                </h4>
                <div>
                  <span className="text-slate-500 block">Subscription Start Date:</span>
                  <span className="text-slate-200 font-mono font-semibold">
                    {formatDateGH(selectedSub.startDate || selectedSub.startedAt)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Next Billing / Renewal Date:</span>
                  <span className="text-emerald-400 font-mono font-semibold">
                    {formatDateGH(selectedSub.nextBillingDate || selectedSub.expiresAt)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">End Date:</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {selectedSub.endDate ? formatDateGH(selectedSub.endDate) : 'Continuous / Ongoing'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Record Created:</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {formatDateGH(selectedSub.createdAt)}
                  </span>
                </div>
              </div>

              {/* Payment & Gateway */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
                <h4 className="font-bold text-purple-400 uppercase tracking-wider text-[11px]">
                  Gateway & Administrative Attributes
                </h4>
                <div>
                  <span className="text-slate-500 block">Payment Provider:</span>
                  <span className="text-slate-200 font-semibold uppercase text-[11px]">
                    {selectedSub.paymentProvider === 'manual_admin'
                      ? 'Manual Admin Intervention'
                      : selectedSub.paymentProvider === 'paystack'
                      ? 'Paystack Gateway'
                      : 'None / Standard Free'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Payment Reference:</span>
                  <span className="text-slate-400 font-mono text-[11px] break-all">
                    {selectedSub.paymentReference || 'none'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Last Updated:</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {formatDateGH(selectedSub.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  onClick={() => handleOpenChangePlan(selectedSub)}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 font-bold text-xs transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Change Plan</span>
                </button>
                <button
                  onClick={() => handleOpenChangeStatus(selectedSub)}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Change Status</span>
                </button>
              </div>

              <button
                onClick={() => setSubDetailModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CHANGE PLAN */}
      {/* ==================================================== */}
      {changePlanModalOpen && subToChangePlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">
                    Change Subscription Plan
                  </h3>
                  <p className="text-xs text-slate-400">
                    Business: <span className="text-slate-200 font-bold">{subToChangePlan.businessName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChangePlanModalOpen(false)}
                disabled={subActionLoading}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Information Notice */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-start space-x-2.5 text-xs text-slate-400">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-200">Manual Admin Plan Change:</strong> This administrative control action updates the tenant plan, adjusts billing rates, and records an audit log entry without simulating Paystack gateway calls.
              </p>
            </div>

            {/* Plan Selector Options */}
            <div className="space-y-3">
              <label className="text-xs uppercase font-bold tracking-wider text-slate-400 block">
                Select New Plan Tier:
              </label>

              {/* Free Tier */}
              <div
                onClick={() => setNewPlanSelected('free')}
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  newPlanSelected === 'free'
                    ? 'bg-slate-800/90 border-emerald-500 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm">Free Plan</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">Standard</span>
                  </div>
                  <p className="text-xs text-slate-400">Single device, core POS & product catalog</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-white text-sm">GH₵0</span>
                  <span className="text-[10px] text-slate-500 block">/month</span>
                </div>
              </div>

              {/* Starter Tier */}
              <div
                onClick={() => setNewPlanSelected('starter')}
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  newPlanSelected === 'starter'
                    ? 'bg-emerald-950/60 border-emerald-500 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-emerald-300 text-sm">Starter Tier</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">Popular</span>
                  </div>
                  <p className="text-xs text-slate-400">Multi-device sync & advanced reporting</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-emerald-400 text-sm">GH₵49</span>
                  <span className="text-[10px] text-slate-500 block">/month</span>
                </div>
              </div>

              {/* Business Tier */}
              <div
                onClick={() => setNewPlanSelected('business')}
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  newPlanSelected === 'business'
                    ? 'bg-teal-950/60 border-teal-500 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-teal-300 text-sm">Business Tier</span>
                    <span className="px-2 py-0.5 rounded-md bg-teal-950 text-teal-300 border border-teal-800 text-[10px] font-bold">Full Suite</span>
                  </div>
                  <p className="text-xs text-slate-400">Unlimited inventory & multi-cashier teams</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-teal-400 text-sm">GH₵99</span>
                  <span className="text-[10px] text-slate-500 block">/month</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
              <button
                onClick={() => setChangePlanModalOpen(false)}
                disabled={subActionLoading}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChangePlan}
                disabled={subActionLoading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center space-x-2 disabled:opacity-50 shadow-md shadow-emerald-950/50"
              >
                {subActionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Plan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm Plan Update</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CHANGE STATUS */}
      {/* ==================================================== */}
      {changeStatusModalOpen && subToChangeStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">
                    Change Subscription Status
                  </h3>
                  <p className="text-xs text-slate-400">
                    Business: <span className="text-slate-200 font-bold">{subToChangeStatus.businessName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChangeStatusModalOpen(false)}
                disabled={subActionLoading}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Information Notice */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-start space-x-2.5 text-xs text-slate-400">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-200">Contract State Update:</strong> Changing the status updates subscription lifecycle state and records an audit log without deleting or corrupting historical tenant records.
              </p>
            </div>

            {/* Status Options */}
            <div className="space-y-2.5">
              <label className="text-xs uppercase font-bold tracking-wider text-slate-400 block">
                Select Subscription Status:
              </label>

              {[
                { id: 'active', name: 'Active', desc: 'Subscription is healthy and operating normally.' },
                { id: 'pending', name: 'Pending', desc: 'Awaiting initial setup or billing verification.' },
                { id: 'past_due', name: 'Past Due', desc: 'Payment was missed; tenant grace period active.' },
                { id: 'cancelled', name: 'Cancelled', desc: 'Subscription terminated by user or platform admin.' },
                { id: 'expired', name: 'Expired', desc: 'Renewal period passed without continuation.' },
              ].map((st) => (
                <div
                  key={st.id}
                  onClick={() => setNewStatusSelected(st.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    newStatusSelected.toLowerCase() === st.id
                      ? 'bg-slate-800 border-emerald-500 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-xs">{st.name}</span>
                      {getStatusBadge(st.id)}
                    </div>
                    <p className="text-[11px] text-slate-400">{st.desc}</p>
                  </div>
                  {newStatusSelected.toLowerCase() === st.id && (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
              <button
                onClick={() => setChangeStatusModalOpen(false)}
                disabled={subActionLoading}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChangeStatus}
                disabled={subActionLoading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center space-x-2 disabled:opacity-50 shadow-md shadow-emerald-950/50"
              >
                {subActionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Status...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm Status Change</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* FLOATING TOAST NOTIFICATION */}
      {/* ==================================================== */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-950 border border-emerald-700 text-emerald-200 shadow-2xl flex items-center space-x-3 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-900 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
