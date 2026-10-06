import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Coins,
  Gift,
  Share2,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  UserCheck,
  RefreshCw,
  Sliders,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  DollarSign,
  Tag,
  Flame,
  UserX,
  X,
  Check,
} from 'lucide-react';
import { api } from '../services/api.js';
import type { Business, Customer, User } from '../types/index.js';

interface Props {
  business?: Business | null;
  onNavigateToCustomer?: (customerId: string) => void;
}

export const LoyaltyRetentionCenter: React.FC<Props> = ({
  business,
  onNavigateToCustomer,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'retention' | 'redemptions' | 'referrals' | 'settings'>('members');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedRetention, setSelectedRetention] = useState<string>('all');

  // Modal states
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [selectedCustomerForRedeem, setSelectedCustomerForRedeem] = useState<any>(null);
  const [redeemPoints, setRedeemPoints] = useState<number>(50);
  const [redeemNotes, setRedeemNotes] = useState('');
  const [redeemSubmitting, setRedeemSubmitting] = useState(false);
  const [redeemError, setRedeemError] = useState('');

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedCustomerForAdjust, setSelectedCustomerForAdjust] = useState<any>(null);
  const [adjustPoints, setAdjustPoints] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [referrerId, setReferrerId] = useState('');
  const [referredId, setReferredId] = useState('');
  const [referralNotes, setReferralNotes] = useState('');
  const [referralSubmitting, setReferralSubmitting] = useState(false);
  const [referralError, setReferralError] = useState('');

  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState('');

  const fetchLoyaltyData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, profilesRes, oppsRes, redemptionsRes, configRes] = await Promise.all([
        fetch('/api/loyalty/analytics', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/loyalty/customers', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/loyalty/opportunities', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/loyalty/redemptions', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/loyalty/config', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
      ]);

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (profilesRes.ok) setProfiles(await profilesRes.json());
      if (oppsRes.ok) setOpportunities(await oppsRes.json());
      if (redemptionsRes.ok) setRedemptions(await redemptionsRes.json());
      if (configRes.ok) setConfig(await configRes.json());
    } catch (err) {
      console.error('Failed to fetch loyalty data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyaltyData();
  }, [business?.id]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (selectedTier !== 'all' && p.tier !== selectedTier) return false;
      if (selectedRetention !== 'all' && p.retentionStatus !== selectedRetention) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.customerName?.toLowerCase().includes(q);
        const matchPhone = p.customerPhone?.includes(q);
        const matchTier = p.tier?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchTier) return false;
      }
      return true;
    });
  }, [profiles, selectedTier, selectedRetention, searchQuery]);

  const handleRedeemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForRedeem) return;
    setRedeemSubmitting(true);
    setRedeemError('');

    try {
      const res = await fetch('/api/loyalty/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          customerId: selectedCustomerForRedeem.customerId,
          points: redeemPoints,
          notes: redeemNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to redeem reward.');
      }

      setRedeemModalOpen(false);
      fetchLoyaltyData();
    } catch (err: any) {
      setRedeemError(err.message);
    } finally {
      setRedeemSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForAdjust) return;
    if (!adjustReason.trim()) {
      setAdjustError('A valid operational reason is required.');
      return;
    }

    setAdjustSubmitting(true);
    setAdjustError('');

    try {
      const res = await fetch('/api/loyalty/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          customerId: selectedCustomerForAdjust.customerId,
          points: adjustPoints,
          reason: adjustReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to adjust points.');
      }

      setAdjustModalOpen(false);
      fetchLoyaltyData();
    } catch (err: any) {
      setAdjustError(err.message);
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleApproveRedemption = async (redemptionId: string) => {
    try {
      const res = await fetch(`/api/loyalty/redemptions/${redemptionId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        fetchLoyaltyData();
      }
    } catch (err) {
      console.error('Failed to approve redemption:', err);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setConfigSaving(true);
    setConfigMessage('');

    try {
      const res = await fetch('/api/loyalty/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save config.');
      setConfigMessage('Loyalty settings updated successfully.');
      setTimeout(() => setConfigMessage(''), 3500);
      fetchLoyaltyData();
    } catch (err: any) {
      setConfigMessage(`Error: ${err.message}`);
    } finally {
      setConfigSaving(false);
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'Platinum':
        return 'bg-purple-950/80 text-purple-400 border-purple-800/80';
      case 'Gold':
        return 'bg-amber-950/80 text-amber-400 border-amber-800/80';
      case 'Silver':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      default:
        return 'bg-amber-900/30 text-amber-500 border-amber-800/40';
    }
  };

  const getRetentionBadge = (status: string) => {
    switch (status) {
      case 'LOYAL':
        return { label: 'Loyal', color: 'bg-emerald-950/90 text-emerald-400 border-emerald-800/70' };
      case 'HIGHLY_ENGAGED':
        return { label: 'Highly Engaged', color: 'bg-teal-950/90 text-teal-400 border-teal-800/70' };
      case 'RETURNING':
        return { label: 'Returning', color: 'bg-blue-950/90 text-blue-400 border-blue-800/70' };
      case 'NEW':
        return { label: 'New Customer', color: 'bg-sky-950/90 text-sky-400 border-sky-800/70' };
      case 'AT_RISK':
        return { label: 'At Risk of Churn', color: 'bg-amber-950/90 text-amber-400 border-amber-800/70' };
      case 'INACTIVE':
        return { label: 'Inactive (>45d)', color: 'bg-rose-950/90 text-rose-400 border-rose-800/70' };
      case 'LAPSED':
        return { label: 'Lapsed (>90d)', color: 'bg-slate-900 text-slate-400 border-slate-800' };
      default:
        return { label: status, color: 'bg-slate-900 text-slate-300 border-slate-800' };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Customer Loyalty, Retention & Growth
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-400 border border-emerald-800">
                Stage 4N
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Encourage repeat patronage, reward loyal customers, and prevent churn with controlled points & milestone intelligence.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchLoyaltyData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-2 transition border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Active Members</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white">{analytics.activeMembersCount}</p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {analytics.totalCustomersWithPoints} customers with points
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Points in Circulation</span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400">{analytics.totalPointsCirculating.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Equiv: GH₵ {analytics.circulatingPointsMonetaryValueGhs.toFixed(2)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Points Redeemed</span>
              <Gift className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-black text-purple-400">{analytics.totalPointsRedeemed.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Valued GH₵ {analytics.redeemedPointsMonetaryValueGhs.toFixed(2)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Repeat Rate</span>
              <TrendingUp className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-2xl font-black text-teal-400">{analytics.repeatCustomerRatePercent.toFixed(1)}%</p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Retention rate {analytics.retentionRatePercent.toFixed(1)}%
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>At Risk / Inactive</span>
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400">
              {analytics.retentionStatusCounts?.AT_RISK || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {analytics.retentionStatusCounts?.INACTIVE || 0} inactive customers
            </p>
          </div>
        </div>
      )}

      {/* 3. Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'members'
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Members & Tiers ({profiles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('retention')}
          className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'retention'
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Retention Opportunities ({opportunities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('redemptions')}
          className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'redemptions'
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Voucher Redemptions ({redemptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Program Rules</span>
        </button>
      </div>

      {/* 4. Tab Contents */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search member by customer name, phone number, tier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="all">All Tiers</option>
                <option value="Platinum">Platinum</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Bronze">Bronze</option>
              </select>

              <select
                value={selectedRetention}
                onChange={(e) => setSelectedRetention(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="all">All Retention Statuses</option>
                <option value="LOYAL">Loyal</option>
                <option value="HIGHLY_ENGAGED">Highly Engaged</option>
                <option value="RETURNING">Returning</option>
                <option value="AT_RISK">At Risk</option>
                <option value="INACTIVE">Inactive</option>
                <option value="LAPSED">Lapsed</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="p-3.5">Customer / Contact</th>
                    <th className="p-3.5">Tier & Qualification</th>
                    <th className="p-3.5 text-right">Points Balance</th>
                    <th className="p-3.5 text-right">Cash Value</th>
                    <th className="p-3.5">Retention Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredProfiles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No customer loyalty profiles match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProfiles.map((p) => {
                      const retBadge = getRetentionBadge(p.retentionStatus);
                      return (
                        <tr key={p.customerId} className="hover:bg-slate-800/30 transition">
                          <td className="p-3.5">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs">
                                {p.customerName?.charAt(0).toUpperCase() || 'C'}
                              </div>
                              <div>
                                <p className="font-bold text-white truncate max-w-[170px]">{p.customerName}</p>
                                <p className="text-[11px] text-slate-400 font-mono">{p.customerPhone || 'No phone'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getTierBadge(p.tier)}`}>
                              {p.tier}
                            </span>
                            <p className="text-[10px] text-slate-500 mt-1 max-w-[180px] truncate" title={p.tierQualificationReason}>
                              {p.tierQualificationReason}
                            </p>
                          </td>
                          <td className="p-3.5 text-right">
                            <span className="font-extrabold text-amber-400 text-sm">
                              {p.pointsBalance.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Earned: {p.lifetimePointsEarned}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-medium text-emerald-400">
                            GH₵ {p.monetaryValueGhs.toFixed(2)}
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${retBadge.color}`}>
                              {retBadge.label}
                            </span>
                            {p.retentionExplanation && (
                              <p className="text-[10px] text-slate-500 mt-1 max-w-[190px] truncate" title={p.retentionExplanation}>
                                {p.retentionExplanation}
                              </p>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => {
                                  setSelectedCustomerForRedeem(p);
                                  setRedeemPoints(Math.min(p.pointsBalance, 50));
                                  setRedeemModalOpen(true);
                                }}
                                disabled={p.pointsBalance <= 0}
                                className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 hover:bg-emerald-900 text-[11px] font-bold transition disabled:opacity-30"
                              >
                                Redeem
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCustomerForAdjust(p);
                                  setAdjustPoints(10);
                                  setAdjustReason('');
                                  setAdjustModalOpen(true);
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition"
                              >
                                Adjust
                              </button>
                              {onNavigateToCustomer && (
                                <button
                                  onClick={() => onNavigateToCustomer(p.customerId)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                                  title="View Customer Profile"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'retention' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {opportunities.length === 0 ? (
              <div className="col-span-2 p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">No At-Risk or Retention Alerts</p>
                <p className="text-xs text-slate-400 mt-1">
                  Customer engagement is healthy across your business. No urgent re-engagement tasks required today.
                </p>
              </div>
            ) : (
              opportunities.map((opp) => {
                return (
                  <div
                    key={opp.id}
                    className={`p-5 rounded-2xl border bg-slate-900/90 shadow-sm flex flex-col justify-between ${
                      opp.priority === 'high' ? 'border-rose-900/60' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          opp.priority === 'high' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {opp.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {opp.customerTier} Tier
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white mb-1">
                        {opp.customerName}
                      </h4>
                      <p className="text-xs text-slate-400 mb-3">
                        {opp.reason}
                      </p>

                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 mb-4">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                          Recommended Action
                        </span>
                        {opp.recommendedAction}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                      <div className="text-[11px] text-slate-400">
                        Points: <span className="font-bold text-amber-400">{opp.pointsBalance}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {opp.customerPhone && (
                          <a
                            href={`https://wa.me/${opp.customerPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 hover:bg-emerald-900 text-xs font-bold transition flex items-center space-x-1.5"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                        {onNavigateToCustomer && (
                          <button
                            onClick={() => onNavigateToCustomer(opp.customerId)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                          >
                            Profile
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'redemptions' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Voucher Redemptions & Reward History</h3>
              <span className="text-xs text-slate-400">Total: {redemptions.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="p-3.5">Voucher Code</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5 text-right">Points</th>
                    <th className="p-3.5 text-right">GHS Value</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {redemptions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No loyalty reward vouchers issued yet.
                      </td>
                    </tr>
                  ) : (
                    redemptions.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3.5 font-mono font-bold text-emerald-400">
                          {r.code}
                        </td>
                        <td className="p-3.5 font-semibold text-white">
                          {r.customerName || 'Customer'}
                        </td>
                        <td className="p-3.5 text-right font-bold text-amber-400">
                          {r.pointsRedeemed}
                        </td>
                        <td className="p-3.5 text-right font-bold text-white">
                          GH₵ {r.monetaryValueGhs.toFixed(2)}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            r.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : r.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-950 text-amber-400 border-amber-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400 text-[11px]">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 text-right">
                          {r.status === 'PENDING_APPROVAL' && (
                            <button
                              onClick={() => handleApproveRedemption(r.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition shadow-xs"
                            >
                              Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && config && (
        <form onSubmit={handleSaveConfig} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm max-w-3xl space-y-6 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Loyalty & Retention Program Rules</h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Configure points accrual, redemption rates, and qualification rules for your business.
              </p>
            </div>
            {configMessage && (
              <span className="px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-semibold">
                {configMessage}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Program Enabled</label>
              <select
                value={config.enabled ? 'true' : 'false'}
                onChange={(e) => setConfig({ ...config, enabled: e.target.value === 'true' })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-hidden focus:border-emerald-500"
              >
                <option value="true">Enabled (Active)</option>
                <option value="false">Disabled (Paused)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Points Per GH₵ 10 Spent</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={config.pointsPerCurrencyUnit ? config.pointsPerCurrencyUnit * 10 : 1}
                onChange={(e) => setConfig({ ...config, pointsPerCurrencyUnit: Number(e.target.value) / 10 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Minimum Sale for Points (GH₵)</label>
              <input
                type="number"
                min="0"
                value={config.minimumPurchaseForPoints || 0}
                onChange={(e) => setConfig({ ...config, minimumPurchaseForPoints: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Minimum Points to Redeem</label>
              <input
                type="number"
                min="10"
                value={config.minimumPointsToRedeem || 50}
                onChange={(e) => setConfig({ ...config, minimumPointsToRedeem: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Point Monetary Value (GH₵ per Point)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={config.pointValueGhs || 0.1}
                onChange={(e) => setConfig({ ...config, pointValueGhs: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-hidden focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500">e.g. 0.10 means 100 points = GH₵ 10.00</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Require Staff Approval for Redemptions</label>
              <select
                value={config.requireApprovalForRewards ? 'true' : 'false'}
                onChange={(e) => setConfig({ ...config, requireApprovalForRewards: e.target.value === 'true' })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-hidden focus:border-emerald-500"
              >
                <option value="true">Yes (Manager approval required)</option>
                <option value="false">No (Instant voucher issuance)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={configSaving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-md shadow-emerald-950/40 disabled:opacity-50"
            >
              {configSaving ? 'Saving Rules...' : 'Save Loyalty Rules'}
            </button>
          </div>
        </form>
      )}

      {/* Redeem Modal */}
      {redeemModalOpen && selectedCustomerForRedeem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Gift className="w-4 h-4 text-emerald-400" />
                <span>Redeem Loyalty Points</span>
              </h3>
              <button
                onClick={() => setRedeemModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-white">{selectedCustomerForRedeem.customerName}</p>
              <p className="text-[11px] text-slate-400">
                Available Points: <span className="font-bold text-amber-400">{selectedCustomerForRedeem.pointsBalance}</span> (Valued at GH₵ {selectedCustomerForRedeem.monetaryValueGhs.toFixed(2)})
              </p>
            </div>

            {redeemError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300">
                {redeemError}
              </div>
            )}

            <form onSubmit={handleRedeemSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Points to Redeem</label>
                <input
                  type="number"
                  min="10"
                  max={selectedCustomerForRedeem.pointsBalance}
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-hidden focus:border-emerald-500"
                  required
                />
                <span className="text-[11px] text-emerald-400">
                  Equivalent voucher value: GH₵ {(redeemPoints * (config?.pointValueGhs || 0.1)).toFixed(2)}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Redemption Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Applied against order, reward voucher issued"
                  value={redeemNotes}
                  onChange={(e) => setRedeemNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRedeemModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={redeemSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-xs disabled:opacity-50"
                >
                  {redeemSubmitting ? 'Redeeming...' : 'Confirm Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModalOpen && selectedCustomerForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Audited Points Adjustment</span>
              </h3>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-white">{selectedCustomerForAdjust.customerName}</p>
              <p className="text-[11px] text-slate-400">
                Current Balance: <span className="font-bold text-amber-400">{selectedCustomerForAdjust.pointsBalance}</span> points
              </p>
            </div>

            {adjustError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Points Adjustment (+ to add, - to subtract)</label>
                <input
                  type="number"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Audit Reason (Required)</label>
                <textarea
                  rows={2}
                  placeholder="Explain why this adjustment is made (e.g. goodwill bonus, correction)"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-hidden focus:border-emerald-500 resize-none"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-xs disabled:opacity-50"
                >
                  {adjustSubmitting ? 'Saving...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
