import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Settings,
  Users,
  Lock,
  Activity,
  FileText,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  UserX,
  UserCheck,
  Key,
  Wrench,
  History,
  HardDrive,
  Eye,
  Sliders,
  DollarSign,
  AlertCircle,
  Save,
  Check,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import type {
  User,
  AuditLog,
  OperationalPolicies,
  SecurityEvent,
  DataIntegrityReport,
  SystemHealthReport,
  ConfigurationHistoryRecord,
  StaffPermissions,
} from '../types/index.js';

interface BusinessGovernanceCenterProps {
  onClose?: () => void;
}

export const BusinessGovernanceCenter: React.FC<BusinessGovernanceCenterProps> = () => {
  const { user, business } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'policies' | 'staff' | 'audit' | 'security' | 'integrity' | 'health'
  >('policies');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Operational Policies State
  const [policies, setPolicies] = useState<OperationalPolicies>({
    allowStaffStockAdjustment: false,
    allowStaffCreditSales: true,
    allowStaffSaleCancellation: false,
    allowStaffManualLoyaltyAdjust: false,
    requireApprovalForCreditSale: false,
    requireApprovalForStockAdjustment: true,
    requireApprovalForSaleCancellation: true,
    maxStaffCreditLimitGhs: 500,
  });
  const [policiesSaving, setPoliciesSaving] = useState(false);

  // Staff State
  const [staffList, setStaffList] = useState<User[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffStatusFilter, setStaffStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [selectedStaffForPermissions, setSelectedStaffForPermissions] = useState<User | null>(null);
  const [tempPermissions, setTempPermissions] = useState<Partial<StaffPermissions>>({});
  const [staffActionLoading, setStaffActionLoading] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditModuleFilter, setAuditModuleFilter] = useState('all');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');

  // Security Events State
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securitySeverityFilter, setSecuritySeverityFilter] = useState('all');

  // Data Integrity State
  const [integrityReport, setIntegrityReport] = useState<DataIntegrityReport | null>(null);
  const [integrityScanning, setIntegrityScanning] = useState(false);
  const [repairExecuting, setRepairExecuting] = useState(false);

  // System Health & Config History State
  const [systemHealth, setSystemHealth] = useState<SystemHealthReport | null>(null);
  const [configHistory, setConfigHistory] = useState<ConfigurationHistoryRecord[]>([]);

  const isOwner = user?.role === 'business_owner' || user?.role === 'admin' || user?.role === 'master_admin';
  const canViewFinancials = isOwner || user?.permissions?.financial_reports === true;

  // Initial Load
  const fetchAllData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [
        summaryRes,
        policiesRes,
        staffRes,
        auditRes,
        securityRes,
        integrityRes,
        healthRes,
        historyRes,
      ] = await Promise.allSettled([
        api.getGovernanceSummary(),
        api.getOperationalPolicies(),
        api.getGovernanceStaff(),
        api.getGovernanceAuditLogs({ page: 1, limit: 30 }),
        api.getGovernanceSecurityEvents(),
        api.runDataIntegrityDiagnostic(),
        api.getSystemHealth(),
        api.getConfigurationHistory(),
      ]);

      if (policiesRes.status === 'fulfilled' && policiesRes.value?.policies) {
        setPolicies(policiesRes.value.policies);
      }
      if (staffRes.status === 'fulfilled' && staffRes.value?.staff) {
        setStaffList(staffRes.value.staff);
      }
      if (auditRes.status === 'fulfilled' && auditRes.value?.logs) {
        setAuditLogs(auditRes.value.logs);
        setAuditTotal(auditRes.value.total || 0);
      }
      if (securityRes.status === 'fulfilled' && securityRes.value?.events) {
        setSecurityEvents(securityRes.value.events);
      }
      if (integrityRes.status === 'fulfilled') {
        setIntegrityReport(integrityRes.value);
      }
      if (healthRes.status === 'fulfilled') {
        setSystemHealth(healthRes.value);
      }
      if (historyRes.status === 'fulfilled' && historyRes.value?.history) {
        setConfigHistory(historyRes.value.history);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load governance data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Save Operational Policies
  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      setErrorMessage('Only the business owner or master administrator can modify operational governance policies.');
      return;
    }
    setPoliciesSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await api.updateOperationalPolicies(policies);
      setPolicies(res.policies);
      setSuccessMessage('Operational governance policies updated and verified.');
      // Refresh config history & audit
      api.getConfigurationHistory().then((h) => setConfigHistory(h.history));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update operational policies.');
    } finally {
      setPoliciesSaving(false);
    }
  };

  // Staff Status Toggle (Suspend / Reactivate)
  const handleToggleStaffStatus = async (staffMember: User, targetStatus: 'active' | 'suspended' | 'inactive') => {
    setStaffActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await api.updateStaffStatus(staffMember.id, targetStatus);
      setStaffList((prev) => prev.map((s) => (s.id === staffMember.id ? res.staff : s)));
      setSuccessMessage(`Staff member ${staffMember.fullName} is now ${targetStatus}.`);
      api.getGovernanceSecurityEvents().then((e) => setSecurityEvents(e.events));
      api.getConfigurationHistory().then((h) => setConfigHistory(h.history));
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to set staff status to ${targetStatus}.`);
    } finally {
      setStaffActionLoading(false);
    }
  };

  // Save Permissions Modal
  const handleSavePermissions = async () => {
    if (!selectedStaffForPermissions) return;
    setStaffActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.updateStaffPermissions(selectedStaffForPermissions.id, tempPermissions);
      setStaffList((prev) =>
        prev.map((s) => (s.id === selectedStaffForPermissions.id ? res.staff : s))
      );
      setSelectedStaffForPermissions(null);
      setSuccessMessage(`Permissions updated for ${selectedStaffForPermissions.fullName}.`);
      api.getConfigurationHistory().then((h) => setConfigHistory(h.history));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update permissions.');
    } finally {
      setStaffActionLoading(false);
    }
  };

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchesSearch =
        !staffSearch ||
        s.fullName?.toLowerCase().includes(staffSearch.toLowerCase()) ||
        s.email?.toLowerCase().includes(staffSearch.toLowerCase()) ||
        s.phone?.includes(staffSearch);
      const matchesStatus = staffStatusFilter === 'all' || s.status === staffStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [staffList, staffSearch, staffStatusFilter]);

  // Query Audit Logs with Filters
  const handleFilterAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getGovernanceAuditLogs({
        page: auditPage,
        limit: 30,
        module: auditModuleFilter !== 'all' ? auditModuleFilter : undefined,
        severity: auditSeverityFilter !== 'all' ? auditSeverityFilter : undefined,
        search: auditSearch.trim() || undefined,
      });
      setAuditLogs(res.logs);
      setAuditTotal(res.total);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to query audit logs.');
    } finally {
      setLoading(false);
    }
  };

  // Export Audit Logs
  const handleExportAuditLogs = (format: 'csv' | 'json') => {
    const token = localStorage.getItem('bmgh_token');
    const url = `/api/governance/audit-logs/export?format=${format}&token=${token || ''}`;
    window.open(url, '_blank');
  };

  // Run Integrity Diagnostics
  const handleRunDiagnostic = async () => {
    setIntegrityScanning(true);
    setErrorMessage('');
    try {
      const res = await api.runDataIntegrityDiagnostic();
      setIntegrityReport(res);
      setSuccessMessage('Data integrity scan completed successfully.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Diagnostic scan failed.');
    } finally {
      setIntegrityScanning(false);
    }
  };

  // Execute Repair
  const handleExecuteRepair = async (repairType: string) => {
    if (!isOwner) {
      setErrorMessage('Only the business owner can execute state-changing integrity repairs.');
      return;
    }
    setRepairExecuting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await api.executeDataRepair(repairType);
      setSuccessMessage(res.message);
      // Re-run diagnostic
      const refreshed = await api.runDataIntegrityDiagnostic();
      setIntegrityReport(refreshed);
      api.getConfigurationHistory().then((h) => setConfigHistory(h.history));
    } catch (err: any) {
      setErrorMessage(err.message || 'Repair operation failed.');
    } finally {
      setRepairExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Business Administration & Governance
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 border border-emerald-800 text-emerald-400">
                  Control Center
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized operational policies, staff authorizations, auditable governance, and automated integrity diagnostics.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setRefreshing(true);
                fetchAllData();
              }}
              disabled={refreshing}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Status'}</span>
            </button>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Integrity Status
            </span>
            <div className="flex items-center space-x-1.5 mt-1">
              {integrityReport?.status === 'HEALTHY' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span
                className={`text-xs font-bold ${
                  integrityReport?.status === 'HEALTHY' ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {integrityReport?.status || 'HEALTHY'} ({integrityReport?.score ?? 100}%)
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Active Staff Accounts
            </span>
            <div className="flex items-center space-x-1.5 mt-1">
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-white">
                {staffList.filter((s) => s.status === 'active').length} of {staffList.length} Active
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Security Incidents
            </span>
            <div className="flex items-center space-x-1.5 mt-1">
              <ShieldAlert
                className={`w-4 h-4 shrink-0 ${
                  securityEvents.some((e) => e.severity === 'CRITICAL') ? 'text-rose-400' : 'text-slate-400'
                }`}
              />
              <span className="text-xs font-bold text-white">
                {securityEvents.filter((e) => e.severity === 'CRITICAL' || e.severity === 'WARNING').length} Alerts
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              System Latency
            </span>
            <div className="flex items-center space-x-1.5 mt-1">
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-emerald-400">
                {systemHealth?.performance.responseTimeMs ?? '< 5'}ms (Optimal)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-center space-x-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center space-x-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto space-x-2">
        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 whitespace-nowrap transition ${
            activeTab === 'policies'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Operational Policies</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 whitespace-nowrap transition ${
            activeTab === 'staff'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Staff Access Control</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 whitespace-nowrap transition ${
            activeTab === 'audit'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Audit Trail</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 whitespace-nowrap transition ${
            activeTab === 'security'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Security Events</span>
        </button>

        <button
          onClick={() => setActiveTab('integrity')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 whitespace-nowrap transition ${
            activeTab === 'integrity'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Data Integrity & Repair</span>
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 whitespace-nowrap transition ${
            activeTab === 'health'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>System Health & History</span>
        </button>
      </div>

      {/* TAB 1: OPERATIONAL POLICIES */}
      {activeTab === 'policies' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-white">Business Operational Policies</h2>
              <p className="text-xs text-slate-400">
                Authoritative governance policies enforced on all cashier actions and transactions.
              </p>
            </div>
            {!isOwner && (
              <span className="px-2.5 py-1 bg-amber-950/80 border border-amber-800/80 text-amber-400 text-[10px] font-bold rounded-lg flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>Owner Modification Only</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSavePolicies} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Credit Sales Policy */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-start justify-between">
                <div className="pr-3">
                  <h3 className="text-xs font-bold text-white">Allow Staff Credit Sales</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    When disabled, staff cannot record partial or debt sales. All transactions must be paid in full.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={!isOwner}
                  checked={policies.allowStaffCreditSales}
                  onChange={(e) =>
                    setPolicies({ ...policies, allowStaffCreditSales: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 shrink-0 mt-1"
                />
              </div>

              {/* Max Staff Credit Limit */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-bold text-white">Max Staff Credit Limit (GH₵)</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Maximum debt balance a staff member is permitted to originate per transaction.
                </p>
                <div className="mt-3 flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-400">GH₵</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    disabled={!isOwner}
                    value={policies.maxStaffCreditLimitGhs}
                    onChange={(e) =>
                      setPolicies({
                        ...policies,
                        maxStaffCreditLimitGhs: Number(e.target.value) || 0,
                      })
                    }
                    className="w-32 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex space-x-1">
                    {[200, 500, 1000, 2000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        disabled={!isOwner}
                        onClick={() => setPolicies({ ...policies, maxStaffCreditLimitGhs: preset })}
                        className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stock Adjustment Policy */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-start justify-between">
                <div className="pr-3">
                  <h3 className="text-xs font-bold text-white">Allow Staff Stock Adjustments</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Permit staff to manually alter product inventory counts (e.g. damaged goods or shrinkage).
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={!isOwner}
                  checked={policies.allowStaffStockAdjustment}
                  onChange={(e) =>
                    setPolicies({ ...policies, allowStaffStockAdjustment: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 shrink-0 mt-1"
                />
              </div>

              {/* Sale Cancellation Policy */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-start justify-between">
                <div className="pr-3">
                  <h3 className="text-xs font-bold text-white">Allow Staff Sale Cancellation</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Permit staff to void completed sales without requiring prior owner authorization.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={!isOwner}
                  checked={policies.allowStaffSaleCancellation}
                  onChange={(e) =>
                    setPolicies({ ...policies, allowStaffSaleCancellation: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 shrink-0 mt-1"
                />
              </div>

              {/* Loyalty Adjustment Policy */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-start justify-between">
                <div className="pr-3">
                  <h3 className="text-xs font-bold text-white">Allow Staff Manual Loyalty Points Adjust</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Permit staff to manually grant or deduct customer loyalty reward points.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={!isOwner}
                  checked={policies.allowStaffManualLoyaltyAdjust}
                  onChange={(e) =>
                    setPolicies({ ...policies, allowStaffManualLoyaltyAdjust: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 shrink-0 mt-1"
                />
              </div>

              {/* Approval Requirements */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-start justify-between">
                <div className="pr-3">
                  <h3 className="text-xs font-bold text-white">Require Approval for Stock Adjustments</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Triggers manager approval task whenever manual stock adjustments exceed baseline thresholds.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={!isOwner}
                  checked={policies.requireApprovalForStockAdjustment}
                  onChange={(e) =>
                    setPolicies({ ...policies, requireApprovalForStockAdjustment: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 shrink-0 mt-1"
                />
              </div>
            </div>

            {isOwner && (
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={policiesSaving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 transition shadow-md shadow-emerald-950"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{policiesSaving ? 'Saving Policies...' : 'Save & Enforce Policies'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 2: STAFF ACCESS CONTROL */}
      {activeTab === 'staff' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-sm font-bold text-white">Staff Management & Access Control</h2>
              <p className="text-xs text-slate-400">
                Control active cashiers, assign operational roles, and enforce security suspensions.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search staff..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <select
                value={staffStatusFilter}
                onChange={(e: any) => setStaffStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Staff Member</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Assigned Scope</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{staff.fullName}</div>
                      <div className="text-[11px] text-slate-400">{staff.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          staff.status === 'active'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : staff.status === 'suspended'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {staff.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {staff.assignedScope || 'Storefront & Register'}
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setSelectedStaffForPermissions(staff);
                          setTempPermissions(staff.permissions || {});
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold transition"
                      >
                        Permissions
                      </button>

                      {staff.status === 'suspended' ? (
                        <button
                          onClick={() => handleToggleStaffStatus(staff, 'active')}
                          disabled={staffActionLoading}
                          className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 rounded text-[11px] font-semibold transition"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleStaffStatus(staff, 'suspended')}
                          disabled={staffActionLoading}
                          className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-400 rounded text-[11px] font-semibold transition"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Permissions Modal */}
          {selectedStaffForPermissions && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white">
                    Permissions: {selectedStaffForPermissions.fullName}
                  </h3>
                  <button
                    onClick={() => setSelectedStaffForPermissions(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    &times;
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 py-4 max-h-96 overflow-y-auto">
                  {[
                    { key: 'pos_sales', label: 'Sales / Register' },
                    { key: 'view_products', label: 'View Products' },
                    { key: 'manage_products', label: 'Manage Stock & Products' },
                    { key: 'customers', label: 'Customer Directory' },
                    { key: 'debtors', label: 'Debtors & Debt Collection' },
                    { key: 'expenses', label: 'Store Expenses' },
                    { key: 'financial_reports', label: 'Financial Reports' },
                    { key: 'business_settings', label: 'Store Settings' },
                    { key: 'manage_staff', label: 'Staff Management' },
                    { key: 'view_audit', label: 'View Audit Logs' },
                    { key: 'view_security', label: 'View Security Logs' },
                  ].map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800/80 p-2 rounded-lg cursor-pointer text-xs text-slate-300"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean((tempPermissions as any)[perm.key])}
                        onChange={(e) =>
                          setTempPermissions({
                            ...tempPermissions,
                            [perm.key]: e.target.checked,
                          })
                        }
                        className="rounded border-slate-700 text-emerald-500"
                      />
                      <span>{perm.label}</span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setSelectedStaffForPermissions(null)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePermissions}
                    disabled={staffActionLoading}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                  >
                    Save Permissions
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white">Immutable Audit Trail</h2>
                {!canViewFinancials && (
                  <span className="px-2 py-0.5 bg-amber-950 text-amber-400 text-[10px] font-bold rounded-md border border-amber-800">
                    Financial Privacy Redacted
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Complete forensic record of business actions, timestamped and cryptographically traceable.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleExportAuditLogs('csv')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => handleExportAuditLogs('json')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-4">
            <input
              type="text"
              placeholder="Search details or user..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <select
              value={auditModuleFilter}
              onChange={(e) => setAuditModuleFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Modules</option>
              <option value="authentication">Authentication</option>
              <option value="sales">Sales / POS</option>
              <option value="products">Products & Stock</option>
              <option value="customers">Customers</option>
              <option value="staff">Staff & Access</option>
              <option value="configuration">Configuration</option>
              <option value="integrity">Data Integrity</option>
            </select>
            <select
              value={auditSeverityFilter}
              onChange={(e) => setAuditSeverityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
            <button
              onClick={handleFilterAuditLogs}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
            >
              Apply Filter
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Module</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp || log.createdAt).toLocaleString('en-GB', {
                        timeZone: 'Africa/Accra',
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">
                      {log.userName || 'System'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 uppercase text-[10px]">
                      {log.module || 'operations'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">{log.action}</td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-md truncate">{log.details}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.severity === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : log.severity === 'WARNING'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {log.severity || 'INFO'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY EVENTS */}
      {activeTab === 'security' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-white">Security Event Monitoring</h2>
              <p className="text-xs text-slate-400">
                Continuous surveillance for authorization anomalies, policy violations, and account suspensions.
              </p>
            </div>
            <select
              value={securitySeverityFilter}
              onChange={(e) => setSecuritySeverityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warnings</option>
              <option value="INFO">Informational</option>
            </select>
          </div>

          <div className="space-y-2.5">
            {securityEvents
              .filter((e) => securitySeverityFilter === 'all' || e.severity === securitySeverityFilter)
              .map((event) => (
                <div
                  key={event.id}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          event.severity === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : event.severity === 'WARNING'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {event.severity}
                      </span>
                      <span className="text-xs font-bold text-white">{event.type}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(event.timestamp).toLocaleString('en-GB', {
                          timeZone: 'Africa/Accra',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{event.description}</p>
                    <div className="text-[11px] text-slate-400">
                      User: <span className="text-slate-200">{event.userName || 'Unknown'}</span>{' '}
                      {event.endpoint && (
                        <>
                          &bull; Endpoint: <span className="font-mono text-slate-400">{event.endpoint}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            {securityEvents.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                No security alerts detected. System operating within secure parameters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DATA INTEGRITY & REPAIR */}
      {activeTab === 'integrity' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-white">Data Integrity Diagnostics & Self-Healing</h2>
              <p className="text-xs text-slate-400">
                Automated validation of database relations, customer balance ledger sync, and stock movement consistency.
              </p>
            </div>
            <button
              onClick={handleRunDiagnostic}
              disabled={integrityScanning}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${integrityScanning ? 'animate-spin' : ''}`} />
              <span>{integrityScanning ? 'Scanning...' : 'Run Full Diagnostic Scan'}</span>
            </button>
          </div>

          {integrityReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Integrity Health</span>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    {integrityReport.score}% &mdash; {integrityReport.status}
                  </div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Orphaned Records</span>
                  <div className="text-lg font-bold text-white mt-1">
                    {integrityReport.orphanedEntitiesCount}
                  </div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Balance Discrepancies</span>
                  <div className="text-lg font-bold text-white mt-1">
                    {integrityReport.balanceDiscrepanciesCount}
                  </div>
                </div>
              </div>

              {/* Repair Actions */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-bold text-white mb-2">Automated Self-Healing Actions</h3>
                <p className="text-[11px] text-slate-400 mb-3">
                  One-click verified database repair tasks. Every action is logged to audit trail and configuration history.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => handleExecuteRepair('recalculate_debt_balances')}
                    disabled={repairExecuting || !isOwner}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                  >
                    <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Synchronize Customer Debt Balances</span>
                  </button>
                  <button
                    onClick={() => handleExecuteRepair('reconcile_stock_quantities')}
                    disabled={repairExecuting || !isOwner}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                  >
                    <Wrench className="w-3.5 h-3.5 text-teal-400" />
                    <span>Reconcile Stock Ledger with Products</span>
                  </button>
                  <button
                    onClick={() => handleExecuteRepair('clean_orphaned_references')}
                    disabled={repairExecuting || !isOwner}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-400" />
                    <span>Re-link Orphaned References</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: SYSTEM HEALTH & CONFIG HISTORY */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Health Overview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-white mb-4">Tenant Health & Engine Metrics</h2>
            {systemHealth && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Data Records</span>
                  <div className="text-base font-bold text-white mt-1">
                    {systemHealth.storage.totalRecordsCount}
                  </div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Active Sessions</span>
                  <div className="text-base font-bold text-emerald-400 mt-1">
                    {systemHealth.sessions.activeSessionsCount}
                  </div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Average Latency</span>
                  <div className="text-base font-bold text-white mt-1">
                    {systemHealth.performance.responseTimeMs}ms
                  </div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Engine Uptime</span>
                  <div className="text-base font-bold text-white mt-1">
                    {Math.round(systemHealth.performance.uptimeSeconds / 60)} min
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Configuration History Changelog */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-white mb-2">Configuration History & Policy Changelog</h2>
            <p className="text-xs text-slate-400 mb-4">
              Chronological log of operational policy updates, staff status transitions, and governance repairs.
            </p>

            <div className="space-y-2.5">
              {configHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                        {item.area.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-bold text-white">{item.action}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(item.timestamp).toLocaleString('en-GB', {
                          timeZone: 'Africa/Accra',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{item.summary}</p>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Changed by: <span className="text-slate-300">{item.userName}</span>
                    </div>
                  </div>
                </div>
              ))}
              {configHistory.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-500">
                  No configuration alterations recorded. Default operational policies are active.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
