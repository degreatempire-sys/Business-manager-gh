import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Search,
  MessageSquare,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Clock,
  ArrowDownRight,
  Filter,
  Check,
  X,
  Printer,
  Share2,
  FileText,
  ChevronRight,
  User,
  CreditCard,
  Building2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api.js';
import {
  openWhatsAppDebtReminder,
  openWhatsAppDebtPaymentReceipt,
} from '../utils/whatsapp.js';
import { getAccraToday, formatAccraDate, formatAccraDateTime } from '../utils/date.js';
import type {
  Debtor,
  Business,
  PaymentMethod,
  CustomerStatement,
  DebtPaymentReceipt,
  Sale,
  CustomerPayment,
} from '../types/index.js';

interface DebtorsViewProps {
  business: Business | null;
  onOpenReceipt?: (sale: Sale) => void;
}

export const DebtorsView: React.FC<DebtorsViewProps> = ({ business, onOpenReceipt }) => {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Overdue' | 'Outstanding' | 'Partially Paid'
  >('All');

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentDate, setPaymentDate] = useState<string>(getAccraToday());
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Debtor Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsDebtor, setDetailsDebtor] = useState<Debtor | null>(null);
  const [detailsStatement, setDetailsStatement] =
    useState<CustomerStatement | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsActiveTab, setDetailsActiveTab] = useState<
    'sales' | 'payments'
  >('sales');

  // Repayment Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] =
    useState<DebtPaymentReceipt | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currency = business?.currency || 'GH₵';

  const loadDebtors = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getDebtors();
      setDebtors(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load debtors list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebtors();
  }, []);

  const openPaymentModal = (d: Debtor) => {
    setSelectedDebtor(d);
    setPaymentAmount(d.amountOwed.toFixed(2));
    setPaymentMethod('Cash');
    setPaymentDate(getAccraToday());
    setPaymentRef('');
    setPaymentNotes('');
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtor) return;

    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }

    if (amt > selectedDebtor.amountOwed) {
      setError(
        `Payment amount cannot exceed current outstanding debt of ${currency} ${selectedDebtor.amountOwed.toFixed(
          2
        )}.`
      );
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const res = await api.recordDebtPayment({
        customerId: selectedDebtor.customerId,
        amount: amt,
        paymentMethod,
        paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
        date: paymentDate || new Date().toISOString().slice(0, 10),
        reference: paymentRef.trim() || undefined,
        notes:
          paymentNotes.trim() ||
          `Debt payment received via ${paymentMethod}`,
      });

      setSuccessMsg(
        `Payment of ${currency} ${amt.toFixed(2)} recorded for ${selectedDebtor.customerName}!`
      );
      setTimeout(() => setSuccessMsg(''), 4000);

      setPaymentModalOpen(false);

      // Open Payment Receipt
      if (res && res.receipt) {
        setCurrentReceipt(res.receipt);
        setReceiptModalOpen(true);
      }

      await loadDebtors();

      // If details modal was open for this customer, refresh statement
      if (detailsModalOpen && detailsDebtor?.customerId === selectedDebtor.customerId) {
        const stmt = await api.getCustomerStatement(selectedDebtor.customerId);
        setDetailsStatement(stmt);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record customer payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReminder = (debtor: Debtor) => {
    if (!debtor.customerPhone) {
      setError(`No phone number found for ${debtor.customerName}.`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    openWhatsAppDebtReminder(
      debtor.customer,
      debtor.amountOwed,
      business,
      debtor.lastCreditSaleReceipt
    );
  };

  const handleOpenDetails = async (debtor: Debtor) => {
    setDetailsDebtor(debtor);
    setDetailsModalOpen(true);
    setDetailsLoading(true);
    try {
      const stmt = await api.getCustomerStatement(debtor.customerId);
      setDetailsStatement(stmt);
    } catch (err: any) {
      console.error('Failed to load statement:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleShareReceiptWhatsApp = () => {
    if (currentReceipt) {
      openWhatsAppDebtPaymentReceipt(currentReceipt, currency);
    }
  };

  // Calculations
  const totalOutstandingDebt = debtors.reduce(
    (sum, d) => sum + Math.max(0, d.amountOwed),
    0
  );
  const overdueDebtCount = debtors.filter((d) => d.status === 'Overdue').length;
  const totalDebtorsCount = debtors.filter((d) => d.amountOwed > 0).length;

  const filteredDebtors = useMemo(() => {
    return debtors.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = d.customerName.toLowerCase().includes(q);
      const phoneMatch = d.customerPhone ? d.customerPhone.includes(q) : false;
      const receiptMatch = d.lastCreditSaleReceipt
        ? d.lastCreditSaleReceipt.toLowerCase().includes(q)
        : false;

      const matchesSearch = !q || nameMatch || phoneMatch || receiptMatch;

      let matchesStatus = true;
      if (statusFilter === 'Overdue') {
        matchesStatus = d.status === 'Overdue';
      } else if (statusFilter === 'Outstanding') {
        matchesStatus = d.status === 'Outstanding';
      } else if (statusFilter === 'Partially Paid') {
        matchesStatus = d.status === 'Partially Paid';
      }

      return matchesSearch && matchesStatus;
    });
  }, [debtors, searchQuery, statusFilter]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Debtors & Credit Sales
          </h1>
          <p className="text-xs text-slate-400">
            Track customer debts, send WhatsApp reminders, and record balance repayments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-2xl flex items-center gap-3 shadow-inner">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider block">
                Total Debt Owed to Shop
              </span>
              <span className="text-base font-black text-amber-400 font-mono">
                {currency} {totalOutstandingDebt.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="text-red-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search debtor by name, phone, or receipt number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['All', 'Overdue', 'Outstanding', 'Partially Paid'] as const).map(
            (st) => {
              const count =
                st === 'All'
                  ? debtors.length
                  : st === 'Overdue'
                  ? debtors.filter((d) => d.status === 'Overdue').length
                  : st === 'Outstanding'
                  ? debtors.filter((d) => d.status === 'Outstanding').length
                  : debtors.filter((d) => d.status === 'Partially Paid').length;

              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                    statusFilter === st
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{st}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                      statusFilter === st
                        ? 'bg-emerald-800 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Debtors List */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Customer Debt Ledger</h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
              {filteredDebtors.length} debtor{filteredDebtors.length === 1 ? '' : 's'}
            </span>
          </div>
          <button
            onClick={loadDebtors}
            className="text-xs text-slate-400 hover:text-emerald-400 transition"
          >
            Refresh Ledger
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            Loading debtors and credit records...
          </div>
        ) : filteredDebtors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Credit Sales</th>
                  <th className="pb-3">Paid</th>
                  <th className="pb-3">Outstanding Debt</th>
                  <th className="pb-3">Credit Limit</th>
                  <th className="pb-3">Last Sale</th>
                  <th className="pb-3">Last Payment</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDebtors.map((d) => {
                  const isOverdue = d.status === 'Overdue';
                  const isPartiallyPaid = d.status === 'Partially Paid';
                  const isSettled = d.amountOwed <= 0;

                  return (
                    <tr
                      key={d.customerId}
                      className="hover:bg-slate-800/30 transition group"
                    >
                      {/* Customer Name */}
                      <td className="py-3.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(d)}
                          className="font-bold text-slate-200 hover:text-emerald-400 text-left transition flex items-center gap-1.5"
                        >
                          <span>{d.customerName}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition" />
                        </button>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 text-slate-300 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{d.customerPhone || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Credit Sales */}
                      <td className="py-3.5 text-slate-300 font-mono">
                        {currency} {d.totalCreditSales.toFixed(2)}
                      </td>

                      {/* Paid */}
                      <td className="py-3.5 text-emerald-400 font-mono">
                        {currency} {d.totalPaid.toFixed(2)}
                      </td>

                      {/* Outstanding Debt */}
                      <td className="py-3.5 font-black text-amber-400 text-sm font-mono">
                        {currency} {d.amountOwed.toFixed(2)}
                      </td>

                      {/* Credit Limit */}
                      <td className="py-3.5 text-slate-400 font-mono">
                        {d.creditLimit > 0
                          ? `${currency} ${d.creditLimit.toFixed(2)}`
                          : 'No limit'}
                      </td>

                      {/* Last Sale */}
                      <td className="py-3.5 text-slate-400">
                        {d.lastCreditSaleDate ? (
                          <div>
                            <div>
                              {formatAccraDate(d.lastCreditSaleDate)}
                            </div>
                            {d.lastCreditSaleReceipt && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                #{d.lastCreditSaleReceipt}
                              </span>
                            )}
                          </div>
                        ) : (
                          'None'
                        )}
                      </td>

                      {/* Last Payment */}
                      <td className="py-3.5 text-slate-400">
                        {d.lastPaymentDate ? (
                          <div>
                            <div className="text-emerald-400 font-mono">
                              +{currency} {(d.lastPaymentAmount || 0).toFixed(2)}
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {formatAccraDate(d.lastPaymentDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">No payment yet</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            isSettled
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                              : isOverdue
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                              : isPartiallyPaid
                              ? 'bg-sky-950/80 text-sky-300 border border-sky-800/80'
                              : 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                          }`}
                        >
                          {isOverdue && (
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                          )}
                          {isSettled && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          )}
                          {d.status}
                        </span>
                        {isOverdue && d.daysOverdue !== undefined && d.daysOverdue > 0 && (
                          <span className="block text-[10px] text-rose-400 font-semibold mt-0.5">
                            {d.daysOverdue} {d.daysOverdue === 1 ? 'day' : 'days'} overdue
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleSendReminder(d)}
                          disabled={!d.customerPhone || d.amountOwed <= 0}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800/80 hover:bg-emerald-800 text-emerald-300 text-[11px] font-semibold transition inline-flex items-center gap-1 disabled:opacity-40"
                          title="Send WhatsApp Payment Reminder"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Reminder</span>
                        </button>

                        <button
                          onClick={() => openPaymentModal(d)}
                          disabled={d.amountOwed <= 0}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition inline-flex items-center gap-1 shadow-sm disabled:opacity-40"
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>Record Payment</span>
                        </button>

                        <button
                          onClick={() => handleOpenDetails(d)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition inline-flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Cards List */}
            <div className="md:hidden space-y-3 pt-2">
              {filteredDebtors.map((d) => {
                const isOverdue = d.status === 'Overdue';
                const isPartiallyPaid = d.status === 'Partially Paid';
                const isSettled = d.amountOwed <= 0;

                return (
                  <div
                    key={`mob-${d.customerId}`}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(d)}
                          className="font-bold text-white hover:text-emerald-400 text-left text-sm"
                        >
                          {d.customerName}
                        </button>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          {d.customerPhone || 'No phone'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            isSettled
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                              : isOverdue
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                              : isPartiallyPaid
                              ? 'bg-sky-950/80 text-sky-300 border border-sky-800/80'
                              : 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                          }`}
                        >
                          {d.status}
                        </span>
                        {isOverdue && d.daysOverdue !== undefined && d.daysOverdue > 0 && (
                          <span className="block text-[10px] text-rose-400 font-semibold mt-0.5">
                            {d.daysOverdue} {d.daysOverdue === 1 ? 'day' : 'days'} overdue
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400">Total Credit:</span>
                        <p className="font-mono font-bold text-slate-200">
                          {currency} {d.totalCreditSales.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Amount Paid:</span>
                        <p className="font-mono font-bold text-emerald-400">
                          {currency} {d.totalPaid.toFixed(2)}
                        </p>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-800 flex justify-between items-center">
                        <span className="text-[10px] text-amber-400 font-bold uppercase">Balance Owed:</span>
                        <span className="font-mono font-black text-amber-400 text-sm">
                          {currency} {d.amountOwed.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleSendReminder(d)}
                        disabled={!d.customerPhone || d.amountOwed <= 0}
                        className="flex-1 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-800/80 border border-emerald-800/60 text-emerald-300 text-xs font-semibold transition disabled:opacity-40 flex items-center justify-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Reminder</span>
                      </button>

                      <button
                        onClick={() => openPaymentModal(d)}
                        disabled={d.amountOwed <= 0}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-40 flex items-center justify-center gap-1 shadow-sm"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Pay Debt</span>
                      </button>

                      <button
                        onClick={() => handleOpenDetails(d)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                        title="View Details"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <h4 className="text-sm font-bold text-slate-300">No Debtors Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              All customer accounts are settled in full or no credit sales have been recorded.
            </p>
          </div>
        )}
      </div>

      {/* Record Debt Payment Modal */}
      {paymentModalOpen && selectedDebtor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Record Debt Repayment
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Receive customer balance and generate receipt
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Customer Name:</span>
                  <span className="font-bold text-white">
                    {selectedDebtor.customerName}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Phone Number:</span>
                  <span className="font-mono text-slate-300">
                    {selectedDebtor.customerPhone || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Total Current Debt:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {currency} {selectedDebtor.amountOwed.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Amount and Quick fill buttons */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Payment Amount ({currency}) *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentAmount(
                          (selectedDebtor.amountOwed * 0.5).toFixed(2)
                        )
                      }
                      className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-medium transition"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentAmount(selectedDebtor.amountOwed.toFixed(2))
                      }
                      className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800 text-[10px] text-emerald-300 font-bold transition"
                    >
                      Full Balance
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedDebtor.amountOwed}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-hidden focus:border-emerald-500"
                />
                {Number(paymentAmount) > 0 &&
                  Number(paymentAmount) <= selectedDebtor.amountOwed && (
                    <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                      <span>Remaining Balance:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {currency}{' '}
                        {Math.max(
                          0,
                          selectedDebtor.amountOwed - Number(paymentAmount)
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(
                    [
                      'Cash',
                      'Mobile Money',
                      'Bank Transfer',
                      'Card',
                    ] as PaymentMethod[]
                  ).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 px-3 rounded-xl font-medium transition text-center ${
                        paymentMethod === m
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Reference / ID
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. MoMo Trans ID"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Cleared 50% part payment"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Recording...' : 'Confirm & Issue Receipt'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Debtor Details & Statement Modal */}
      {detailsModalOpen && detailsDebtor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold">
                  {detailsDebtor.customerName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {detailsDebtor.customerName}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <span>{detailsDebtor.customerPhone || 'No phone'}</span>
                    <span>•</span>
                    <span className="font-mono text-amber-400">
                      Debt: {currency} {detailsDebtor.amountOwed.toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    openPaymentModal(detailsDebtor);
                  }}
                  disabled={detailsDebtor.amountOwed <= 0}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-40 flex items-center gap-1"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
                <button
                  onClick={() => setDetailsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="p-6 pb-2 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Credit Limit
                </span>
                <span className="text-sm font-bold text-white font-mono">
                  {detailsDebtor.creditLimit > 0
                    ? `${currency} ${detailsDebtor.creditLimit.toFixed(2)}`
                    : 'Unlimited'}
                </span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Total Credit Sales
                </span>
                <span className="text-sm font-bold text-slate-200 font-mono">
                  {currency} {detailsDebtor.totalCreditSales.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Total Paid
                </span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {currency} {detailsDebtor.totalPaid.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-2xl">
                <span className="text-[10px] text-amber-300 uppercase font-semibold block">
                  Outstanding Debt
                </span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  {currency} {detailsDebtor.amountOwed.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Available Credit
                </span>
                <span className="text-sm font-bold text-sky-400 font-mono">
                  {detailsDebtor.creditLimit > 0
                    ? `${currency} ${Math.max(
                        0,
                        detailsDebtor.creditLimit - detailsDebtor.amountOwed
                      ).toFixed(2)}`
                    : 'Unlimited'}
                </span>
              </div>
            </div>

            {/* Tab switch */}
            <div className="flex border-b border-slate-800 px-6 pt-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDetailsActiveTab('sales')}
                className={`pb-3 pr-4 transition ${
                  detailsActiveTab === 'sales'
                    ? 'text-emerald-400 border-b-2 border-emerald-500 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Credit Sales History ({detailsStatement?.sales.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setDetailsActiveTab('payments')}
                className={`pb-3 px-4 transition ${
                  detailsActiveTab === 'payments'
                    ? 'text-emerald-400 border-b-2 border-emerald-500 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Repayment History ({detailsStatement?.payments.length || 0})
              </button>
            </div>

            {/* Tab contents */}
            <div className="p-6 max-h-80 overflow-y-auto space-y-3">
              {detailsLoading ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Loading statement records...
                </div>
              ) : detailsActiveTab === 'sales' ? (
                detailsStatement && detailsStatement.sales.length > 0 ? (
                  <div className="space-y-2">
                    {detailsStatement.sales.map((sale) => {
                      const isSaleOverdue =
                        sale.balance > 0 &&
                        sale.dueDate &&
                        new Date(sale.dueDate + 'T23:59:59').getTime() <
                          Date.now();
                      const saleStatus =
                        sale.balance <= 0
                          ? 'Paid'
                          : isSaleOverdue
                          ? 'Overdue'
                          : sale.amountPaid > 0
                          ? 'Partially Paid'
                          : 'Outstanding';

                      return (
                        <div
                          key={sale.id}
                          className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>#{sale.receiptNumber}</span>
                              <span className="text-[10px] px-2 py-0.2 rounded-md bg-slate-800 text-slate-300">
                                {sale.paymentMethod}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.2 rounded-md font-bold ${
                                  saleStatus === 'Paid'
                                    ? 'bg-emerald-950 text-emerald-300'
                                    : saleStatus === 'Overdue'
                                    ? 'bg-rose-950 text-rose-300'
                                    : 'bg-amber-950 text-amber-300'
                                }`}
                              >
                                {saleStatus}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {formatAccraDateTime(sale.createdAt)} •{' '}
                              {sale.items.length} items
                            </p>
                            {sale.dueDate && (
                              <p className="text-[10px] text-amber-400">
                                Due: {formatAccraDate(sale.dueDate)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="font-bold text-white font-mono">
                                {currency} {sale.total.toFixed(2)}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                Paid: {currency} {sale.amountPaid.toFixed(2)}
                              </div>
                              {sale.balance > 0 && (
                                <div className="text-[11px] text-amber-400 font-mono font-bold">
                                  Debt: {currency} {sale.balance.toFixed(2)}
                                </div>
                              )}
                            </div>
                            {onOpenReceipt && (
                              <button
                                onClick={() => onOpenReceipt(sale)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                title="View Original Receipt"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 text-xs py-8">
                    No sales recorded for this customer.
                  </p>
                )
              ) : detailsStatement && detailsStatement.payments.length > 0 ? (
                <div className="space-y-2">
                  {detailsStatement.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-emerald-400 flex items-center gap-2 font-mono">
                          <span>+{currency} {p.amount.toFixed(2)}</span>
                          <span className="text-[10px] px-2 py-0.2 rounded-md bg-slate-800 text-slate-300">
                            {p.paymentMethod}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {formatAccraDateTime(p.createdAt || p.date)}
                          {p.reference ? ` • Ref: ${p.reference}` : ''}
                          {p.createdByName ? ` • Staff: ${p.createdByName}` : ''}
                        </p>
                        {p.notes && (
                          <p className="text-[11px] text-slate-500 italic">
                            "{p.notes}"
                          </p>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-slate-400 font-mono">
                        {p.paymentNumber || p.id}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 text-xs py-8">
                  No payment records found for this customer.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Repayment Receipt Modal */}
      {receiptModalOpen && currentReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Payment Receipt
              </span>
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-white text-slate-900 rounded-b-3xl">
              {/* Receipt Header */}
              <div className="text-center space-y-1 border-b border-slate-200 pb-3">
                <h4 className="font-black text-sm uppercase tracking-tight">
                  {currentReceipt.businessName}
                </h4>
                {currentReceipt.businessLocation && (
                  <p className="text-[11px] text-slate-600">
                    {currentReceipt.businessLocation}
                  </p>
                )}
                {currentReceipt.businessPhone && (
                  <p className="text-[11px] text-slate-600 font-mono">
                    Tel: {currentReceipt.businessPhone}
                  </p>
                )}
                <div className="pt-2">
                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    Official Debt Repayment Receipt
                  </span>
                </div>
              </div>

              {/* Meta details */}
              <div className="text-[11px] space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-mono font-bold">
                    {currentReceipt.paymentNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>
                    {formatAccraDateTime(currentReceipt.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold">{currentReceipt.customerName}</span>
                </div>
                {currentReceipt.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-mono">{currentReceipt.customerPhone}</span>
                  </div>
                )}
                {currentReceipt.cashier && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Served By:</span>
                    <span className="font-medium">{currentReceipt.cashier}</span>
                  </div>
                )}
              </div>

              {/* Balance Breakdown */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Previous Debt:</span>
                  <span className="font-mono">
                    {currency} {currentReceipt.originalDebt.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700 text-sm">
                  <span>Amount Paid ({currentReceipt.paymentMethod}):</span>
                  <span className="font-mono">
                    {currency} {currentReceipt.paymentAmount.toFixed(2)}
                  </span>
                </div>
                {currentReceipt.reference && (
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Reference:</span>
                    <span className="font-mono">{currentReceipt.reference}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-sm">
                  <span>Remaining Balance:</span>
                  <span className="font-mono">
                    {currency} {currentReceipt.remainingBalance.toFixed(2)}
                  </span>
                </div>
              </div>

              {currentReceipt.remainingBalance <= 0 ? (
                <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-center text-xs font-bold text-emerald-800">
                  Account Balance Cleared in Full!
                </div>
              ) : (
                <div className="text-center text-[11px] text-slate-500 italic">
                  Thank you for your repayment.
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleShareReceiptWhatsApp}
                  disabled={!currentReceipt.customerPhone}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
