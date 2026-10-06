import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Printer,
  MessageSquare,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  X,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api.js';
import { openWhatsAppInvoice } from '../utils/whatsapp.js';
import { formatAccraDate } from '../utils/date.js';
import type { Invoice, Customer, Product, Business, InvoiceStatus } from '../types/index.js';

interface InvoicesViewProps {
  business: Business | null;
  refreshTrigger?: number;
  onOpenInvoiceModal: (invoice: Invoice) => void;
  onOpenCreateInvoice: () => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  business,
  refreshTrigger,
  onOpenInvoiceModal,
  onOpenCreateInvoice,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [error, setError] = useState('');

  const currency = business?.currency || 'GH₵';

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [refreshTrigger]);

  const handleSendWhatsApp = (inv: Invoice) => {
    if (!inv.customerPhone) {
      setError(`No phone number available for ${inv.customerName}.`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    openWhatsAppInvoice(inv, business);
  };

  const handleUpdateStatus = async (invoiceId: string, status: InvoiceStatus) => {
    try {
      await api.updateInvoiceStatus(invoiceId, status);
      await loadInvoices();
    } catch (err: any) {
      setError(err.message || 'Failed to update invoice status.');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await api.deleteInvoice(invoiceId);
      await loadInvoices();
    } catch (err: any) {
      setError(err.message || 'Failed to delete invoice.');
    }
  };

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
  const totalPending = totalInvoiced - totalPaid;

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Invoices & Quotations
          </h1>
          <p className="text-xs text-slate-400">
            Generate itemized billing invoices, track payments, and share via WhatsApp
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadInvoices}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            title="Refresh Invoices"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={onOpenCreateInvoice}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Invoice</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400">Total Invoiced</span>
          <p className="text-lg sm:text-xl font-black text-white mt-1">
            {currency} {totalInvoiced.toFixed(2)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400">Collected Payments</span>
          <p className="text-lg sm:text-xl font-black text-emerald-400 mt-1">
            {currency} {totalPaid.toFixed(2)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400">Pending / Unpaid</span>
          <p className="text-lg sm:text-xl font-black text-amber-400 mt-1">
            {currency} {totalPending.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by invoice number or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['All', 'Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Table */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Invoices Ledger</h3>
          <span className="text-xs text-slate-400 font-mono">
            {filteredInvoices.length} invoice{filteredInvoices.length === 1 ? '' : 's'}
          </span>
        </div>

        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Invoice No</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Issue Date</th>
                  <th className="pb-3">Due Date</th>
                  <th className="pb-3">Total Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 font-mono font-bold text-emerald-400">
                      {inv.invoiceNumber}
                    </td>

                    <td className="py-3.5 font-bold text-slate-200">
                      {inv.customerName}
                      {inv.customerPhone && (
                        <span className="block text-[10px] text-slate-500 font-mono font-normal">
                          {inv.customerPhone}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 text-slate-400">
                      {formatAccraDate(inv.issueDate)}
                    </td>

                    <td className="py-3.5 text-slate-400">
                      {inv.dueDate ? formatAccraDate(inv.dueDate) : '-'}
                    </td>

                    <td className="py-3.5 font-bold text-white font-mono text-sm">
                      {currency} {inv.total.toFixed(2)}
                    </td>

                    <td className="py-3.5">
                      <select
                        value={inv.status}
                        onChange={(e) => handleUpdateStatus(inv.id, e.target.value as InvoiceStatus)}
                        className={`text-[10px] font-bold rounded-lg px-2 py-1 bg-slate-950 border focus:outline-hidden ${
                          inv.status === 'Paid'
                            ? 'text-emerald-400 border-emerald-800/60'
                            : inv.status === 'Overdue'
                            ? 'text-rose-400 border-rose-800/60'
                            : inv.status === 'Partially Paid'
                            ? 'text-blue-400 border-blue-800/60'
                            : 'text-amber-400 border-amber-800/60'
                        }`}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Partially Paid">Partially Paid</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </td>

                    <td className="py-3.5 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => onOpenInvoiceModal(inv)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print / View</span>
                      </button>

                      <button
                        onClick={() => handleSendWhatsApp(inv)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 hover:bg-emerald-800 text-emerald-400 text-[11px] font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                        title="Send via WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={() => handleDeleteInvoice(inv.id)}
                        className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-red-950/60 hover:text-red-400 text-slate-400 transition inline-flex items-center cursor-pointer"
                        title="Delete Invoice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <h4 className="text-sm font-bold text-slate-300">No Invoices Created Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create professional branded invoices for your wholesale clients or corporate orders.
            </p>
            <button
              onClick={onOpenCreateInvoice}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              + CREATE FIRST INVOICE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
