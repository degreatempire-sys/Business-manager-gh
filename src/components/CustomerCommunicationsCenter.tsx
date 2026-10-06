import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  ExternalLink,
  User,
  Phone,
  FileText,
  SlidersHorizontal,
  X,
  ShieldCheck,
  Check,
  CornerDownRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api.js';
import type {
  Business,
  Customer,
  CommunicationRecord,
  CommunicationTemplate,
  CommunicationOpportunity,
  CommunicationSummary,
  CommunicationType,
  CommunicationChannel,
  CommunicationStatus,
} from '../types/index.js';

interface Props {
  business?: Business | null;
  onNavigateToCustomer?: (customerId: string) => void;
  initialCustomerId?: string;
  initialType?: CommunicationType;
}

export const CustomerCommunicationsCenter: React.FC<Props> = ({
  business,
  onNavigateToCustomer,
  initialCustomerId,
  initialType,
}) => {
  const [activeTab, setActiveTab] = useState<'opportunities' | 'history' | 'templates'>('opportunities');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [summary, setSummary] = useState<CommunicationSummary | null>(null);
  const [opportunities, setOpportunities] = useState<CommunicationOpportunity[]>([]);
  const [communications, setCommunications] = useState<CommunicationRecord[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal states
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<CommunicationOpportunity | null>(null);

  // Compose form states
  const [composeCustomerId, setComposeCustomerId] = useState('');
  const [composeType, setComposeType] = useState<CommunicationType>('GENERAL_CUSTOMER_MESSAGE');
  const [composeTemplateId, setComposeTemplateId] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeSaving, setComposeSaving] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  // Template form states
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null);
  const [tmplName, setTmplName] = useState('');
  const [tmplType, setTmplType] = useState<CommunicationType>('GENERAL_CUSTOMER_MESSAGE');
  const [tmplContent, setTmplContent] = useState('');
  const [tmplSaving, setTmplSaving] = useState(false);
  const [tmplError, setTmplError] = useState<string | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, oppRes, commRes, tmplRes, custRes] = await Promise.all([
        api.getCommunicationSummary().catch(() => null),
        api.getCommunicationOpportunities().catch(() => []),
        api.getCommunications().catch(() => []),
        api.getCommunicationTemplates().catch(() => []),
        api.getCustomers().catch(() => []),
      ]);

      if (sumRes) setSummary(sumRes);
      setOpportunities(oppRes || []);
      setCommunications(commRes || []);
      setTemplates(tmplRes || []);
      setCustomers(custRes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load customer communication data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Handle initial trigger from other views (e.g. customer profile or task)
  useEffect(() => {
    if (initialCustomerId) {
      setComposeCustomerId(initialCustomerId);
      if (initialType) setComposeType(initialType);
      setComposeModalOpen(true);
    }
  }, [initialCustomerId, initialType]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === composeCustomerId);
  }, [customers, composeCustomerId]);

  // When template changes in compose modal, auto-render
  const handleTemplateChange = (templateId: string) => {
    setComposeTemplateId(templateId);
    if (!templateId) return;

    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) return;

    let text = tmpl.content;
    const cust = selectedCustomer;
    const bName = business?.name || 'Our Shop';
    const debtAmt = cust?.currentDebt ? cust.currentDebt.toFixed(2) : '0.00';

    text = text
      .replace(/{{\s*customerName\s*}}/g, cust?.name || 'Valued Customer')
      .replace(/{{\s*businessName\s*}}/g, bName)
      .replace(/{{\s*amountDue\s*}}/g, debtAmt)
      .replace(/{{\s*customMessage\s*}}/g, '');

    setComposeMessage(text);
    setComposeType(tmpl.type);
  };

  const handleOpenComposeForOpportunity = (opp: CommunicationOpportunity) => {
    setSelectedOpportunity(opp);
    setComposeCustomerId(opp.customerId);
    setComposeType(opp.type);
    setComposeMessage(opp.recommendedMessage);
    if (opp.suggestedTemplateId) {
      setComposeTemplateId(opp.suggestedTemplateId);
    }
    setComposeModalOpen(true);
  };

  const handleSaveDraft = async () => {
    if (!composeCustomerId) {
      setComposeError('Please select a customer.');
      return;
    }
    if (!composeMessage.trim()) {
      setComposeError('Please provide message content.');
      return;
    }

    setComposeSaving(true);
    setComposeError(null);
    try {
      await api.createCommunication({
        customerId: composeCustomerId,
        type: composeType,
        channel: 'whatsapp',
        templateId: composeTemplateId || undefined,
        message: composeMessage.trim(),
        status: 'DRAFT',
        relatedTaskId: selectedOpportunity?.relatedTaskId,
        dedupKey: selectedOpportunity?.dedupKey,
      });

      setComposeModalOpen(false);
      resetComposeForm();
      await loadAllData();
      setActiveTab('history');
    } catch (err: any) {
      setComposeError(err.message || 'Failed to save communication draft.');
    } finally {
      setComposeSaving(false);
    }
  };

  const handleApproveAndReady = async () => {
    if (!composeCustomerId) {
      setComposeError('Please select a customer.');
      return;
    }
    if (!composeMessage.trim()) {
      setComposeError('Please provide message content.');
      return;
    }

    setComposeSaving(true);
    setComposeError(null);
    try {
      const comm = await api.createCommunication({
        customerId: composeCustomerId,
        type: composeType,
        channel: 'whatsapp',
        templateId: composeTemplateId || undefined,
        message: composeMessage.trim(),
        status: 'APPROVED',
        relatedTaskId: selectedOpportunity?.relatedTaskId,
        dedupKey: selectedOpportunity?.dedupKey,
      });

      setComposeModalOpen(false);
      resetComposeForm();
      await loadAllData();
      setActiveTab('history');
    } catch (err: any) {
      setComposeError(err.message || 'Failed to approve communication.');
    } finally {
      setComposeSaving(false);
    }
  };

  const handleOpenWhatsAppDirectly = async (commRecord?: CommunicationRecord) => {
    try {
      let record = commRecord;
      if (!record) {
        // Create it first as approved
        if (!composeCustomerId || !composeMessage.trim()) {
          setComposeError('Customer and message content are required.');
          return;
        }
        setComposeSaving(true);
        record = await api.createCommunication({
          customerId: composeCustomerId,
          type: composeType,
          channel: 'whatsapp',
          templateId: composeTemplateId || undefined,
          message: composeMessage.trim(),
          status: 'APPROVED',
          relatedTaskId: selectedOpportunity?.relatedTaskId,
          dedupKey: selectedOpportunity?.dedupKey,
        });
      }

      // Call the open endpoint to update status and receive WhatsApp link
      const res = await api.openCommunication(record.id);
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank', 'noopener,noreferrer');
      }

      setComposeModalOpen(false);
      resetComposeForm();
      await loadAllData();
    } catch (err: any) {
      setComposeError(err.message || 'Failed to open WhatsApp communication link.');
    } finally {
      setComposeSaving(false);
    }
  };

  const resetComposeForm = () => {
    setComposeCustomerId('');
    setComposeType('GENERAL_CUSTOMER_MESSAGE');
    setComposeTemplateId('');
    setComposeMessage('');
    setSelectedOpportunity(null);
    setComposeError(null);
  };

  // Template handling
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmplName.trim() || !tmplContent.trim()) {
      setTmplError('Name and content are required.');
      return;
    }

    setTmplSaving(true);
    setTmplError(null);
    try {
      if (editingTemplate) {
        await api.updateCommunicationTemplate(editingTemplate.id, {
          name: tmplName.trim(),
          type: tmplType,
          content: tmplContent.trim(),
        });
      } else {
        await api.createCommunicationTemplate({
          name: tmplName.trim(),
          type: tmplType,
          channel: 'whatsapp',
          content: tmplContent.trim(),
        });
      }

      setTemplateModalOpen(false);
      setEditingTemplate(null);
      setTmplName('');
      setTmplContent('');
      const tmpls = await api.getCommunicationTemplates();
      setTemplates(tmpls);
    } catch (err: any) {
      setTmplError(err.message || 'Failed to save template.');
    } finally {
      setTmplSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom template?')) return;
    try {
      await api.deleteCommunicationTemplate(id);
      const tmpls = await api.getCommunicationTemplates();
      setTemplates(tmpls);
    } catch (err: any) {
      alert(err.message || 'Failed to delete template.');
    }
  };

  // Filtered lists
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      if (typeFilter !== 'all' && opp.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = opp.customerName.toLowerCase().includes(q);
        const matchPhone = opp.customerPhone.includes(q);
        const matchReason = opp.reason.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchReason) return false;
      }
      return true;
    });
  }, [opportunities, typeFilter, searchQuery]);

  const filteredCommunications = useMemo(() => {
    return communications.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = c.customerName?.toLowerCase().includes(q);
        const matchPhone = c.customerPhone?.includes(q);
        const matchMsg = c.message.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchMsg) return false;
      }
      return true;
    });
  }, [communications, statusFilter, typeFilter, searchQuery]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-950 border border-emerald-800/60 text-emerald-400 flex items-center justify-center shadow-inner">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Customer Communications & Engagement
                </h1>
                <p className="text-xs text-slate-400">
                  Polite debt reminders, post-purchase check-ins, VIP care, and link-based WhatsApp follow-ups.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                resetComposeForm();
                setComposeModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-2 transition shadow-lg shadow-emerald-950"
            >
              <Plus className="w-4 h-4" />
              <span>Compose Message</span>
            </button>
            <button
              onClick={loadAllData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 transition border border-slate-700/60"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Summary Badges */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Opportunities
                </span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl font-black text-amber-400 mt-1">
                {summary.opportunitiesCount}
              </p>
              <span className="text-[10px] text-slate-400">Actionable recommendations</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Drafts
                </span>
                <Clock className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-xl font-black text-white mt-1">{summary.draftsCount}</p>
              <span className="text-[10px] text-slate-400">Awaiting review</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Approved / Ready
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-black text-emerald-400 mt-1">
                {summary.approvedCount}
              </p>
              <span className="text-[10px] text-slate-400">Ready to open in WhatsApp</span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  WhatsApp Opened
                </span>
                <ExternalLink className="w-4 h-4 text-teal-400" />
              </div>
              <p className="text-xl font-black text-white mt-1">{summary.openedCount}</p>
              <span className="text-[10px] text-slate-400">Dispatched via WhatsApp link</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('opportunities')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'opportunities'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Smart Opportunities</span>
          {opportunities.length > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'opportunities' ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-950 text-emerald-400'
              }`}
            >
              {opportunities.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'history'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>History & Outbox</span>
          {communications.length > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'history' ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {communications.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'templates'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Templates ({templates.length})</span>
        </button>
      </div>

      {/* TAB 1: OPPORTUNITIES */}
      {activeTab === 'opportunities' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search opportunities or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Outreach Types</option>
                <option value="DEBT_REMINDER">Debt Reminders</option>
                <option value="PURCHASE_FOLLOW_UP">Purchase Follow-ups</option>
                <option value="CUSTOMER_APPRECIATION">Customer Appreciation</option>
                <option value="INACTIVE_CUSTOMER">Inactive Customer</option>
                <option value="VIP_FOLLOW_UP">VIP Check-in</option>
              </select>
            </div>
          </div>

          {filteredOpportunities.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-white">No Pending Outreach Opportunities</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                All high-priority debtor alerts, post-purchase check-ins, and VIP follow-ups are up to date!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOpportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition space-y-3.5 shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-black text-white">{opp.customerName}</h4>
                        <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{opp.customerPhone}</span>
                        </span>
                      </div>
                      <p className="text-xs text-emerald-400 font-semibold mt-0.5">{opp.reason}</p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        opp.urgency === 'high'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                          : opp.urgency === 'normal'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {opp.urgency} urgency
                    </span>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 leading-relaxed font-sans">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Recommended WhatsApp Message:
                    </p>
                    {opp.recommendedMessage}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {opp.type.replace(/_/g, ' ')}
                      </span>
                      {opp.hasActiveTask && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/50">
                          Task Linked
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenComposeForOpportunity(opp)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition shadow-sm"
                    >
                      <span>Prepare Outreach</span>
                      <CornerDownRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HISTORY & OUTBOX */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search history by recipient or text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="APPROVED">Approved / Ready</option>
                <option value="OPENED">WhatsApp Opened</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Types</option>
                <option value="DEBT_REMINDER">Debt Reminders</option>
                <option value="PURCHASE_FOLLOW_UP">Purchase Follow-up</option>
                <option value="CUSTOMER_APPRECIATION">Customer Appreciation</option>
                <option value="INACTIVE_CUSTOMER">Inactive Customer</option>
                <option value="VIP_FOLLOW_UP">VIP Follow-up</option>
                <option value="GENERAL_CUSTOMER_MESSAGE">General Message</option>
              </select>
            </div>
          </div>

          {filteredCommunications.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Send className="w-6 h-6 text-slate-500" />
              </div>
              <h3 className="text-sm font-bold text-white">No Communications Recorded</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Prepare outreach from the Smart Opportunities tab or click Compose Message above.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Message Preview</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created By</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredCommunications.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{c.customerName || 'Customer'}</div>
                          <div className="text-[11px] text-slate-400">{c.customerPhone}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">
                            {c.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="truncate text-slate-300 font-normal">{c.message}</p>
                          <span className="text-[10px] text-slate-500">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              c.status === 'OPENED' || c.status === 'SENT'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                : c.status === 'APPROVED' || c.status === 'READY'
                                ? 'bg-sky-950 text-sky-400 border border-sky-800/60'
                                : c.status === 'DRAFT'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {c.createdByName}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {c.status === 'DRAFT' && (
                            <button
                              onClick={async () => {
                                await api.approveCommunication(c.id);
                                loadAllData();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px]"
                            >
                              Approve
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenWhatsAppDirectly(c)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] inline-flex items-center space-x-1"
                            title="Open in WhatsApp Web/App"
                          >
                            <span>Open WhatsApp</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
            <div>
              <h3 className="text-sm font-bold text-white">Outreach Templates</h3>
              <p className="text-xs text-slate-400">
                System templates are Ghanaian business standard. You can also create custom templates for your shop.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setTmplName('');
                setTmplType('GENERAL_CUSTOMER_MESSAGE');
                setTmplContent('');
                setTemplateModalOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t) => (
              <div
                key={t.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white">{t.name}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 mt-1 inline-block">
                      {t.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {t.isSystem ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 text-[10px] font-bold border border-emerald-800/50">
                      Standard System
                    </span>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingTemplate(t);
                          setTmplName(t.name);
                          setTmplType(t.type);
                          setTmplContent(t.content);
                          setTemplateModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                  {t.content}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {t.variables.map((v) => (
                    <span
                      key={v}
                      className="px-2 py-0.5 rounded bg-slate-800/70 border border-slate-700/50 text-[10px] font-mono text-emerald-400"
                    >
                      {'{{' + v + '}}'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPOSE MODAL */}
      {composeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-white">Prepare Customer Message</h3>
              </div>
              <button
                onClick={() => setComposeModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {composeError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs">
                {composeError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Customer Selector */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Recipient Customer *</label>
                <select
                  value={composeCustomerId}
                  onChange={(e) => {
                    setComposeCustomerId(e.target.value);
                    if (composeTemplateId) handleTemplateChange(composeTemplateId);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select a customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || 'No phone'}) - Debt: GH₵{' '}
                      {(c.currentDebt || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preferences alert if opted out */}
              {selectedCustomer?.communicationPreferences?.optedOut && (
                <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-300 text-[11px] flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Notice: This customer has requested to opt out of promotional messages.</span>
                </div>
              )}

              {/* Template Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Outreach Type</label>
                  <select
                    value={composeType}
                    onChange={(e) => setComposeType(e.target.value as CommunicationType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="GENERAL_CUSTOMER_MESSAGE">General Message</option>
                    <option value="DEBT_REMINDER">Debt Reminder</option>
                    <option value="PURCHASE_FOLLOW_UP">Purchase Follow-up</option>
                    <option value="CUSTOMER_APPRECIATION">Customer Appreciation</option>
                    <option value="INACTIVE_CUSTOMER">Inactive Customer</option>
                    <option value="VIP_FOLLOW_UP">VIP Check-in</option>
                    <option value="PAYMENT_CONFIRMATION">Payment Confirmation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Apply Template</label>
                  <select
                    value={composeTemplateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Choose template...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Message Content */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-bold">Message Content (WhatsApp) *</label>
                  <span className="text-[10px] text-slate-500">
                    {composeMessage.length} characters
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white leading-relaxed focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="text-[11px] text-slate-500">
                Link will open directly in official WhatsApp.
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={composeSaving}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenWhatsAppDirectly()}
                  disabled={composeSaving}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-950"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE CREATE / EDIT MODAL */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTemplate}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">
                {editingTemplate ? 'Edit Template' : 'Create Custom Template'}
              </h3>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {tmplError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                {tmplError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Template Name *</label>
                <input
                  type="text"
                  value={tmplName}
                  onChange={(e) => setTmplName(e.target.value)}
                  placeholder="e.g. Weekend Special Greeting"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Outreach Type</label>
                <select
                  value={tmplType}
                  onChange={(e) => setTmplType(e.target.value as CommunicationType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="GENERAL_CUSTOMER_MESSAGE">General Message</option>
                  <option value="DEBT_REMINDER">Debt Reminder</option>
                  <option value="PURCHASE_FOLLOW_UP">Purchase Follow-up</option>
                  <option value="CUSTOMER_APPRECIATION">Customer Appreciation</option>
                  <option value="INACTIVE_CUSTOMER">Inactive Customer</option>
                  <option value="VIP_FOLLOW_UP">VIP Follow-up</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Template Content *</label>
                <textarea
                  rows={4}
                  value={tmplContent}
                  onChange={(e) => setTmplContent(e.target.value)}
                  placeholder="Hello {{customerName}}, thank you for shopping with {{businessName}}..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Supported variables: <code className="text-emerald-400">{'{{customerName}}'}</code>,{' '}
                  <code className="text-emerald-400">{'{{businessName}}'}</code>,{' '}
                  <code className="text-emerald-400">{'{{amountDue}}'}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={tmplSaving}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                {tmplSaving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
