import React, { useState, useEffect } from 'react';
import {
  Link2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  CreditCard,
  FileSpreadsheet,
  Download,
  Upload,
  Activity,
  History,
  Check,
  ChevronRight,
  Eye,
  Key,
  Database,
  Layers,
  Zap,
  Globe,
  Sliders,
  DollarSign,
  AlertCircle,
  Search,
} from 'lucide-react';
import { api } from '../services/api.js';
import { canAccessFeature } from '../utils/featureAccess.js';
import { LockedFeatureGate } from './LockedFeatureGate.js';
import type {
  Integration,
  SyncRun,
  WebhookEvent,
  ImportRun,
  ExportRun,
  ExternalPaymentRecord,
  ReconciliationReport,
  IntegrationDiagnosticsReport,
  User,
  Subscription,
} from '../types/index.js';

interface IntegrationsViewProps {
  currentUser: User | null;
  subscription: Subscription | null;
  onUpgradeClick?: () => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  currentUser,
  subscription,
  onUpgradeClick,
}) => {
  const hasAccess = canAccessFeature(subscription, 'integrations');

  const [activeTab, setActiveTab] = useState<'catalog' | 'sync' | 'import_export' | 'reconciliation' | 'diagnostics'>('catalog');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data states
  const [catalog, setCatalog] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [diagnostics, setDiagnostics] = useState<IntegrationDiagnosticsReport | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncRun[]>([]);
  const [webhookHistory, setWebhookHistory] = useState<WebhookEvent[]>([]);

  // Connect Modal State
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [configFields, setConfigFields] = useState<Record<string, string>>({});
  const [secretFields, setSecretFields] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState(false);

  // Testing & Syncing
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Import / Export State
  const [importType, setImportType] = useState<'products' | 'customers'>('products');
  const [rawImportData, setRawImportData] = useState('');
  const [importPreview, setImportPreview] = useState<ImportRun | null>(null);
  const [importing, setImporting] = useState(false);
  const [exportType, setExportType] = useState<'sales' | 'expenses' | 'debtors' | 'inventory'>('sales');
  const [exporting, setExporting] = useState(false);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const loadData = async () => {
    if (!hasAccess) return;
    try {
      setLoading(true);
      const [catList, intList, diag] = await Promise.all([
        api.getIntegrationCatalog().catch(() => []),
        api.getIntegrations().catch(() => []),
        api.getIntegrationDiagnostics().catch(() => null),
      ]);
      setCatalog(catList || []);
      setIntegrations(intList || []);
      setDiagnostics(diag);
    } catch (err: any) {
      showNotification(err.message || 'Failed to load integration data', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <div className="p-6">
        <LockedFeatureGate
          featureKey="integrations"
          title="Business Ecosystem & External Integrations"
          description="Connect Ghana Mobile Money gateways, cloud accounting systems, webhook pipelines, and automated synchronization engines."
          onUpgradeClick={onUpgradeClick}
        />
      </div>
    );
  }

  const handleOpenConnect = (provider: any) => {
    setSelectedProvider(provider);
    setDisplayName(provider.name);
    setConfigFields({});
    setSecretFields({});
    setConnectModalOpen(true);
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;
    try {
      setConnecting(true);
      await api.connectIntegration({
        provider: selectedProvider.id,
        category: selectedProvider.category,
        displayName: displayName || selectedProvider.name,
        configuration: configFields,
        secrets: secretFields,
        locationScope: 'BUSINESS',
      });
      showNotification(`Connected ${selectedProvider.name} successfully!`);
      setConnectModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Connection failed', true);
    } finally {
      setConnecting(false);
    }
  };

  const handleTestConnection = async (integrationId: string) => {
    try {
      setTestingId(integrationId);
      const res = await api.testIntegrationConnection(integrationId);
      if (res.healthy) {
        showNotification(`Connection healthy! Response latency: ${res.latencyMs}ms`);
      } else {
        showNotification(`Health check reported issue: ${res.status}`, true);
      }
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Health check failed', true);
    } finally {
      setTestingId(null);
    }
  };

  const handleTriggerSync = async (integrationId: string, direction: 'IMPORT' | 'EXPORT', entityType: string) => {
    try {
      setSyncingId(integrationId);
      const res = await api.syncIntegration(integrationId, { direction, entityType });
      showNotification(`Sync ${res.status}: ${res.recordsRead} records read (${res.recordsCreated} created)`);
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Sync execution failed', true);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!window.confirm('Are you sure you want to disconnect this integration?')) return;
    try {
      await api.disconnectIntegration(integrationId);
      showNotification('Integration disconnected successfully');
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Disconnect failed', true);
    }
  };

  const handleRunReconciliation = async (provider: string) => {
    try {
      setLoading(true);
      const report = await api.reconcilePayments(provider);
      setReconciliation(report);
      showNotification('Financial reconciliation report updated');
    } catch (err: any) {
      showNotification(err.message || 'Reconciliation failed', true);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewImport = async () => {
    try {
      setImporting(true);
      let rows: any[] = [];
      try {
        rows = JSON.parse(rawImportData);
      } catch {
        // Parse CSV format
        const lines = rawImportData.trim().split('\n');
        if (lines.length > 1) {
          const headers = lines[0].split(',').map((h) => h.trim());
          rows = lines.slice(1).map((line) => {
            const values = line.split(',').map((v) => v.trim());
            const obj: Record<string, any> = {};
            headers.forEach((h, i) => {
              obj[h] = values[i];
            });
            return obj;
          });
        }
      }

      if (!rows.length) {
        showNotification('Please enter valid JSON array or CSV text with rows', true);
        return;
      }

      const res = await api.previewImport({
        entityType: importType,
        rows,
      });
      setImportPreview(res);
      showNotification(`Preview ready: ${res.validRecords} valid, ${res.invalidRecords} invalid rows`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to preview import', true);
    } finally {
      setImporting(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!importPreview) return;
    try {
      setImporting(true);
      const validRows = importPreview.previewRows
        .filter((r) => r.status === 'VALID' || r.status === 'DUPLICATE')
        .map((r) => r.data);

      const res = await api.executeImport({
        importRunId: importPreview.id,
        validatedRows: validRows,
      });
      showNotification(`Import complete! ${res.recordsCreated} records created, ${res.recordsUpdated} updated`);
      setImportPreview(null);
      setRawImportData('');
    } catch (err: any) {
      showNotification(err.message || 'Failed to execute import', true);
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await api.exportAccounting({
        entityType: exportType,
        format: 'JSON',
      });
      // Trigger download
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bmgh-export-${exportType}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification(`Export complete: ${res.data.length} records exported`);
    } catch (err: any) {
      showNotification(err.message || 'Export failed', true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white text-xs">Dismiss</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm font-medium">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white text-xs">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
                <span>Ecosystem & External Integrations</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-950 text-indigo-400 border border-indigo-800/80">
                  Stage 4Q
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Ghana Mobile Money gateways, cloud accounting, webhook pipelines, and sync engines.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Diagnostics Badge */}
        {diagnostics && (
          <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Health Score</p>
                <p className="text-sm font-black text-white">{diagnostics.overallScore}%</p>
              </div>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Connected</p>
              <p className="text-sm font-black text-emerald-400">
                {integrations.filter((i) => i.status === 'CONNECTED').length} Active
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'catalog'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Connected & Catalog ({integrations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('import_export')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'import_export'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Data Import & Export</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('reconciliation');
            handleRunReconciliation('momo_gh');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'reconciliation'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Payment Reconciliation</span>
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'diagnostics'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>8-Point Diagnostics</span>
        </button>
      </div>

      {/* TAB 1: CATALOG & CONNECTED INTEGRATIONS */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Active Integrations */}
          {integrations.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Active Business Connections ({integrations.length})</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrations.map((integ) => (
                  <div
                    key={integ.id}
                    className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                          {integ.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            integ.status === 'CONNECTED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${integ.status === 'CONNECTED' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          {integ.status}
                        </span>
                      </div>

                      <h3 className="font-bold text-white text-sm">{integ.displayName}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {integ.description || `Connected via provider ${integ.provider}`}
                      </p>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Vault Credentials:</span>
                        <span className="font-mono text-emerald-400 flex items-center gap-1">
                          <Key className="w-3 h-3" /> Encrypted (AES-256)
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => handleTestConnection(integ.id)}
                        disabled={testingId === integ.id}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      >
                        <Activity className={`w-3.5 h-3.5 ${testingId === integ.id ? 'animate-spin' : ''}`} />
                        <span>Test</span>
                      </button>

                      {integ.supportedCapabilities.includes('SYNC_EXPORT') && (
                        <button
                          onClick={() => handleTriggerSync(integ.id, 'EXPORT', 'SALES')}
                          disabled={syncingId === integ.id}
                          className="py-1.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingId === integ.id ? 'animate-spin' : ''}`} />
                          <span>Sync</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDisconnect(integ.id)}
                        className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                        title="Disconnect"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Provider Catalog */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>Supported Ecosystem Providers ({catalog.length})</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalog.map((provider) => {
                const pid = provider.providerId || provider.id;
                const pName = provider.displayName || provider.name;
                const existing = integrations.find((i) => i.provider === pid);
                const status = existing?.status || 'NOT_CONNECTED';
                const implType = provider.implementationType || 'READINESS_ADAPTER';

                return (
                  <div
                    key={pid}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300">
                          {provider.category}
                        </span>

                        <div className="flex items-center gap-1">
                          {/* Implementation Classification Badge */}
                          {implType === 'TEST_FIXTURE' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/30">
                              Test Fixture
                            </span>
                          ) : implType === 'REAL_AUTHENTICATED_INTEGRATION' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                              Live Integration
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              Readiness Adapter
                            </span>
                          )}

                          {provider.countryScope === 'GH' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[9px]">
                              GH
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <h3 className="font-bold text-white text-sm">{pName}</h3>
                        {/* Explicit Connection Status */}
                        {status === 'CONNECTED' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
                            CONNECTED
                          </span>
                        ) : status === 'ERROR' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/40">
                            ERROR
                          </span>
                        ) : status === 'DISCONNECTED' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                            DISCONNECTED
                          </span>
                        ) : status === 'PENDING_REAUTH' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/40">
                            PENDING_REAUTH
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/60">
                            READY_TO_CONNECT
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 mt-2">{provider.description}</p>

                      <div className="flex flex-wrap gap-1 mt-3">
                        {provider.supportedCapabilities.map((cap: string) => (
                          <span
                            key={cap}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenConnect({ ...provider, id: pid, name: pName })}
                      className={`w-full py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                        status === 'CONNECTED'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : status === 'ERROR'
                          ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-600/40'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                      }`}
                    >
                      {status === 'CONNECTED' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Configure / Test</span>
                        </>
                      ) : status === 'ERROR' ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Resolve Error</span>
                        </>
                      ) : status === 'PENDING_REAUTH' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Re-authenticate</span>
                        </>
                      ) : status === 'DISCONNECTED' ? (
                        <>
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Reconnect</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Connect Integration</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IMPORT / EXPORT HUB */}
      {activeTab === 'import_export' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SAFE PHASED IMPORT */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Phased Safe Data Import</h3>
                <p className="text-xs text-slate-400">Validate and preview records before executing changes.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Import Target:</label>
                <select
                  value={importType}
                  onChange={(e) => setImportType(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  <option value="products">Products & Inventory</option>
                  <option value="customers">Customers & Contacts</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Paste JSON Array or CSV formatted rows:
                </label>
                <textarea
                  rows={6}
                  value={rawImportData}
                  onChange={(e) => setRawImportData(e.target.value)}
                  placeholder={`name,sellingPrice,buyingPrice,sku,quantity\nMilo 400g,35,28,MILO-400,20\nIdeal Milk,8.5,6.5,IDEAL-160,50`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePreviewImport}
                  disabled={importing || !rawImportData.trim()}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  {importing ? 'Validating...' : '1. Validate & Preview Rows'}
                </button>

                {importPreview && (
                  <button
                    onClick={handleExecuteImport}
                    disabled={importing || importPreview.validRecords === 0}
                    className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
                  >
                    2. Execute Authoritative Import ({importPreview.validRecords} Rows)
                  </button>
                )}
              </div>

              {/* Preview Summary */}
              {importPreview && (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Total Rows: {importPreview.totalRecords}</span>
                    <span className="text-emerald-400 font-bold">{importPreview.validRecords} Valid</span>
                    <span className="text-amber-400 font-bold">{importPreview.invalidRecords} Invalid</span>
                  </div>

                  {importPreview.errors.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 space-y-1">
                      <p className="font-bold">Validation Issues Found:</p>
                      {importPreview.errors.slice(0, 3).map((err, i) => (
                        <p key={i}>• Row {err.row}: {err.error} ({err.field})</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* STRUCTURED ACCOUNTING EXPORT */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Structured Financial Export</h3>
                <p className="text-xs text-slate-400">Export financial records with cryptographic checksums.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Export Entity:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['sales', 'expenses', 'debtors', 'inventory'] as const).map((ent) => (
                    <button
                      key={ent}
                      type="button"
                      onClick={() => setExportType(ent)}
                      className={`p-3 rounded-xl border text-xs font-bold capitalize text-left transition ${
                        exportType === ent
                          ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {ent}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                <p className="font-bold text-white">Security & Auditability:</p>
                <p>• Every exported record is signed with a SHA-256 summary checksum.</p>
                <p>• Respects role-based financial privacy permissions.</p>
              </div>

              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{exporting ? 'Generating...' : `Export ${exportType.toUpperCase()} (JSON)`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENT RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>Mobile Money & Gateway Reconciliation</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Authoritative comparison between internal transaction ledgers and external gateway records. Zero silent mutations.
              </p>
            </div>

            <button
              onClick={() => handleRunReconciliation('momo_gh')}
              disabled={loading}
              className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition flex items-center gap-2 self-start"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Reconcile Ledger</span>
            </button>
          </div>

          {reconciliation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <p className="text-xs text-slate-400">Internal Ledger Total</p>
                <p className="text-xl font-black text-white mt-1">GH₵{reconciliation.internalTotalGhs.toFixed(2)}</p>
                <p className="text-[11px] text-slate-500 mt-1">{reconciliation.internalCount} internal transactions</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <p className="text-xs text-slate-400">External Gateway Total</p>
                <p className="text-xl font-black text-indigo-400 mt-1">GH₵{reconciliation.externalTotalGhs.toFixed(2)}</p>
                <p className="text-[11px] text-slate-500 mt-1">{reconciliation.externalCount} verified payments</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <p className="text-xs text-slate-400">Variance</p>
                <p
                  className={`text-xl font-black mt-1 ${
                    reconciliation.varianceGhs === 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  GH₵{reconciliation.varianceGhs.toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {reconciliation.isBalanced ? 'Perfect match' : 'Action needed'}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <p className="text-xs text-slate-400">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {reconciliation.isBalanced ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Balanced
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Discrepancy Found
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{reconciliation.matchedCount} matched records</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: 8-POINT DIAGNOSTICS */}
      {activeTab === 'diagnostics' && diagnostics && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Integration Diagnostics Suite</h3>
                <p className="text-xs text-slate-400">Comprehensive 8-point check across ecosystem connections.</p>
              </div>
              <span className="text-lg font-black text-emerald-400">{diagnostics.overallScore}% Passed</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {diagnostics.checks.map((check) => (
                <div
                  key={check.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {check.status === 'HEALTHY' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : check.status === 'WARNING' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <h4 className="text-xs font-bold text-white">{check.title}</h4>
                    </div>
                    <p className="text-[11px] text-slate-400">{check.details}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      check.status === 'HEALTHY'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : check.status === 'WARNING'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {check.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONNECT INTEGRATION MODAL */}
      {connectModalOpen && selectedProvider && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Connect {selectedProvider.name}</h3>
                <p className="text-xs text-slate-400">{selectedProvider.category} Integration</p>
              </div>
              <button
                onClick={() => setConnectModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConnectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Secrets Fields */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <p className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Secure Credential Vault (Encrypted Server-Side)</span>
                </p>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">API Key / Merchant Secret</label>
                  <input
                    type="password"
                    value={secretFields.apiKey || ''}
                    onChange={(e) => setSecretFields({ ...secretFields, apiKey: e.target.value })}
                    placeholder="Enter secret key..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Webhook Secret (Optional)</label>
                  <input
                    type="password"
                    value={secretFields.webhookSecret || ''}
                    onChange={(e) => setSecretFields({ ...secretFields, webhookSecret: e.target.value })}
                    placeholder="Enter HMAC secret..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(false)}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {connecting ? 'Saving...' : 'Authorize & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
