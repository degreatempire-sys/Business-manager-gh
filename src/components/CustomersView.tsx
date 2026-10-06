import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  ShoppingBag,
  DollarSign,
  Edit2,
  Trash2,
  X,
  Clock,
  ArrowRight,
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Wallet,
  Sparkles,
  ArrowUpRight,
  Share2,
  Printer,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { LockedFeatureGate } from './LockedFeatureGate.js';
import { canAccessFeature } from '../utils/featureAccess.js';
import { getAccraToday, formatAccraDate, formatAccraDateTime } from '../utils/date.js';
import {
  openWhatsAppDebtReminder,
  openWhatsAppDebtPaymentReceipt,
  formatGhanaPhone,
} from '../utils/whatsapp.js';
import { CustomerIntelligenceModal } from './CustomerIntelligenceModal.js';
import type {
  Customer,
  Business,
  CustomerStatement,
  Sale,
  PaymentMethod,
  DebtPaymentReceipt,
  CommunicationRecord,
  CustomerCommunicationPreferences,
} from '../types/index.js';

interface CustomersViewProps {
  business: Business | null;
  subscription?: any;
  isMasterAdmin?: boolean;
  onNavigateToPOS?: (customerId?: string) => void;
  onOpenReceipt?: (sale: Sale) => void;
  onNavigateToUpgrade?: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  business,
  subscription,
  isMasterAdmin,
  onNavigateToPOS,
  onOpenReceipt,
  onNavigateToUpgrade,
}) => {
  const auth = useAuth();
  const effectiveSubscription = subscription !== undefined ? subscription : auth.subscription;
  const effectiveMasterAdmin =
    isMasterAdmin !== undefined
      ? isMasterAdmin
      : Boolean(auth.user) &&
        (auth.user?.role === 'admin' ||
          auth.user?.role === 'master_admin' ||
          auth.user?.id === 'usr_admin_master' ||
          auth.user?.email?.toLowerCase() === 'admin@businessmanagergh.com');
  const effectiveBusiness = business || auth.business;
  const isAllowed = canAccessFeature(
    effectiveSubscription,
    'customers',
    effectiveMasterAdmin,
    effectiveBusiness
  );

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    | 'all'
    | 'good'
    | 'debt'
    | 'limit_reached'
    | 'active'
    | 'new'
    | 'frequent'
    | 'high_value'
    | 'inactive'
    | 'credit_risk'
  >('all');
  const [sortBy, setSortBy] = useState<
    | 'name_asc'
    | 'name_desc'
    | 'debt_desc'
    | 'purchases_desc'
    | 'transactions_desc'
    | 'inactive_desc'
    | 'newest'
  >('name_asc');

  // Customer Intelligence Modal State
  const [intelligenceModalOpen, setIntelligenceModalOpen] = useState(false);

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Customer Profile & Statement Modal
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState<'purchases' | 'payments' | 'notes' | 'communications'>('purchases');
  const [customerComms, setCustomerComms] = useState<CommunicationRecord[]>([]);
  const [commsLoading, setCommsLoading] = useState(false);
  const [quickMessageText, setQuickMessageText] = useState('');
  const [quickMessageSending, setQuickMessageSending] = useState(false);
  const [purchaseFilterQuery, setPurchaseFilterQuery] = useState('');
  const [purchaseFilterDate, setPurchaseFilterDate] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Record Payment Modal (for customer debt settlement)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Mobile Money');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(getAccraToday());
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Repayment Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<DebtPaymentReceipt | null>(null);

  // Delete State
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Global status banner
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const currency = business?.currency || 'GH₵';

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  const loadCustomers = async () => {
    if (!isAllowed) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAllowed) {
      loadCustomers();
    } else {
      setLoading(false);
    }
  }, [isAllowed]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCreditLimit('');
    setNotes('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || '');
    setAddress(c.address || '');
    setCreditLimit(c.creditLimit !== undefined && c.creditLimit > 0 ? String(c.creditLimit) : '');
    setNotes(c.notes || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Customer full name is required.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Phone number is required.');
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Please provide a valid email address.');
      return;
    }

    const parsedLimit = creditLimit.trim() ? Number(creditLimit) : 0;
    if (isNaN(parsedLimit) || parsedLimit < 0) {
      setFormError('Credit limit must be a positive number.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        creditLimit: parsedLimit,
        notes: notes.trim() || undefined,
      };

      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, payload);
        showFeedback('success', `Customer "${payload.name}" updated successfully.`);
      } else {
        await api.addCustomer(payload);
        showFeedback('success', `Customer "${payload.name}" added to directory.`);
      }

      await loadCustomers();
      setModalOpen(false);

      // If statement modal is open for this customer, refresh it
      if (selectedCustomerId && editingCustomer && selectedCustomerId === editingCustomer.id) {
        openCustomerProfile(selectedCustomerId);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save customer record.');
    } finally {
      setSubmitting(false);
    }
  };

  const openCustomerProfile = async (customerId: string) => {
    try {
      setSelectedCustomerId(customerId);
      setProfileLoading(true);
      setProfileOpen(true);
      setProfileTab('purchases');
      setPurchaseFilterQuery('');
      setPurchaseFilterDate('');
      setNewNoteText('');
      setQuickMessageText('');
      const data = await api.getCustomerStatement(customerId);
      setStatement(data);
      loadCustomerComms(customerId);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to load customer profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const loadCustomerComms = async (customerId: string) => {
    try {
      setCommsLoading(true);
      const list = await api.getCustomerCommunications(customerId);
      setCustomerComms(list);
    } catch (err: any) {
      console.error('Failed to load customer communications:', err);
    } finally {
      setCommsLoading(false);
    }
  };

  const handleToggleCustomerPreference = async (
    field: keyof CustomerCommunicationPreferences,
    value: boolean
  ) => {
    if (!statement?.customer?.id) return;
    try {
      const updated = await api.updateCustomerPreferences(statement.customer.id, {
        [field]: value,
      });
      setStatement({
        ...statement,
        customer: updated,
      });
      await loadCustomers();
      showFeedback('success', 'Customer communication preferences updated.');
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update preferences.');
    }
  };

  const handleSendQuickCustomerMessage = async (
    type: 'DEBT_REMINDER' | 'CUSTOMER_APPRECIATION' | 'GENERAL_CUSTOMER_MESSAGE',
    customText?: string
  ) => {
    if (!statement?.customer?.id) return;
    const cust = statement.customer;
    if (!cust.phone) {
      showFeedback('error', 'Customer does not have a phone number.');
      return;
    }

    try {
      setQuickMessageSending(true);
      let text = customText || '';
      const bName = business?.name || 'Our Shop';

      if (!text) {
        if (type === 'DEBT_REMINDER') {
          const debt = statement.currentDebt || 0;
          text = `Hello ${cust.name}, this is a gentle reminder from ${bName} regarding your outstanding balance of GH₵ ${debt.toFixed(
            2
          )}. Thank you!`;
        } else if (type === 'CUSTOMER_APPRECIATION') {
          text = `Hello ${cust.name}, thank you for your continued patronage with ${bName}! We truly appreciate having you as our valued customer.`;
        } else {
          text = `Hello ${cust.name}, greeting from ${bName}!`;
        }
      }

      const record = await api.createCommunication({
        customerId: cust.id,
        type,
        channel: 'whatsapp',
        message: text,
        status: 'APPROVED',
      });

      const res = await api.openCommunication(record.id);
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank', 'noopener,noreferrer');
      }

      await loadCustomerComms(cust.id);
      setQuickMessageText('');
      showFeedback('success', 'WhatsApp opened and communication recorded.');
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to dispatch WhatsApp message.');
    } finally {
      setQuickMessageSending(false);
    }
  };

  const handleAddCustomerNote = async () => {
    if (!selectedCustomerId || !newNoteText.trim()) return;
    try {
      setAddingNote(true);
      await api.addCustomerNote(selectedCustomerId, newNoteText.trim());
      setNewNoteText('');
      const data = await api.getCustomerStatement(selectedCustomerId);
      setStatement(data);
      await loadCustomers();
      showFeedback('success', 'Customer note added successfully.');
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to add customer note.');
    } finally {
      setAddingNote(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      setDeleting(true);
      await api.deleteCustomer(customerToDelete.id);
      showFeedback('success', `Customer "${customerToDelete.name}" removed from directory.`);
      setCustomerToDelete(null);
      if (profileOpen && selectedCustomerId === customerToDelete.id) {
        setProfileOpen(false);
      }
      await loadCustomers();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete customer.');
    } finally {
      setDeleting(false);
    }
  };

  const openRecordPaymentModal = (cust: Customer) => {
    setPaymentAmount(cust.currentDebt > 0 ? String(cust.currentDebt) : '');
    setPaymentMethod('Mobile Money');
    setPaymentNotes(`Debt settlement for ${cust.name}`);
    setPaymentDate(getAccraToday());
    setPaymentError('');
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement?.customer) return;

    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentError('Please enter a valid payment amount greater than zero.');
      return;
    }

    try {
      setPaymentSubmitting(true);
      setPaymentError('');

      const res = await api.recordCustomerPayment({
        customerId: statement.customer.id,
        customerName: statement.customer.name,
        amount: amt,
        paymentMethod,
        date: paymentDate,
        notes: paymentNotes.trim() || undefined,
      });

      showFeedback(
        'success',
        `Recorded payment of ${currency} ${amt.toFixed(2)} from ${statement.customer.name}.`
      );
      setPaymentModalOpen(false);

      if (res && res.receipt) {
        setCurrentReceipt(res.receipt);
        setReceiptModalOpen(true);
      }

      // Refresh both statement and customer list
      await loadCustomers();
      await openCustomerProfile(statement.customer.id);
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to record payment.');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleShareReceiptWhatsApp = () => {
    if (!currentReceipt) return;
    openWhatsAppDebtPaymentReceipt(currentReceipt, currency);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // Aggregates & Calculations
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const debtors = customers.filter((c) => (c.currentDebt || 0) > 0);
    const totalDebt = customers.reduce((sum, c) => sum + (c.currentDebt || 0), 0);
    const totalPurchases = customers.reduce((sum, c) => sum + (c.totalPurchases || 0), 0);
    return {
      totalCustomers,
      debtorsCount: debtors.length,
      totalDebt,
      totalPurchases,
    };
  }, [customers]);

  // Filtering & Sorting
  const filteredAndSortedCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q));

        if (!matchesQuery) return false;

        const debt = c.currentDebt || 0;
        const limit = c.creditLimit || 0;

        if (statusFilter === 'good') {
          return debt === 0;
        }
        if (statusFilter === 'debt') {
          return debt > 0;
        }
        if (statusFilter === 'limit_reached') {
          return limit > 0 && debt >= limit;
        }
        if (statusFilter === 'active') {
          return c.segment === 'Active' || c.segments?.includes('Active');
        }
        if (statusFilter === 'new') {
          return c.segment === 'New' || c.segments?.includes('New');
        }
        if (statusFilter === 'frequent') {
          return c.segment === 'Frequent' || c.segments?.includes('Frequent');
        }
        if (statusFilter === 'high_value') {
          return c.segment === 'High Value' || c.segments?.includes('High Value');
        }
        if (statusFilter === 'inactive') {
          return c.segment === 'Inactive' || c.segments?.includes('Inactive');
        }
        if (statusFilter === 'credit_risk') {
          return c.segment === 'Credit Risk' || c.segments?.includes('Credit Risk');
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'name_desc') {
          return b.name.localeCompare(a.name);
        }
        if (sortBy === 'debt_desc') {
          return (b.currentDebt || 0) - (a.currentDebt || 0);
        }
        if (sortBy === 'purchases_desc') {
          return (b.totalPurchases || 0) - (a.totalPurchases || 0);
        }
        if (sortBy === 'transactions_desc') {
          return (b.transactionCount || 0) - (a.transactionCount || 0);
        }
        if (sortBy === 'inactive_desc') {
          return (b.daysSinceLastPurchase ?? -1) - (a.daysSinceLastPurchase ?? -1);
        }
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
      });
  }, [customers, searchQuery, statusFilter, sortBy]);

  const getCustomerStatus = (c: Customer) => {
    const debt = c.currentDebt || 0;
    const limit = c.creditLimit || 0;

    if (c.segment === 'Credit Risk' || (limit > 0 && debt > limit)) {
      return {
        label: 'Credit Risk',
        bg: 'bg-rose-950/80 border-rose-800/80 text-rose-400',
        badgeColor: 'text-rose-400',
      };
    }
    if (limit > 0 && debt >= limit) {
      return {
        label: 'Limit Reached',
        bg: 'bg-rose-950/80 border-rose-800/80 text-rose-400',
        badgeColor: 'text-rose-400',
      };
    }
    if (debt > 0) {
      return {
        label: 'Active Debt',
        bg: 'bg-amber-950/80 border-amber-800/80 text-amber-400',
        badgeColor: 'text-amber-400',
      };
    }
    if (c.segment === 'Frequent') {
      return {
        label: 'Frequent Buyer',
        bg: 'bg-purple-950/80 border-purple-800/80 text-purple-400',
        badgeColor: 'text-purple-400',
      };
    }
    if (c.segment === 'High Value') {
      return {
        label: 'High Value',
        bg: 'bg-blue-950/80 border-blue-800/80 text-blue-400',
        badgeColor: 'text-blue-400',
      };
    }
    if (c.segment === 'Inactive') {
      return {
        label: 'Inactive',
        bg: 'bg-slate-800 border-slate-700 text-slate-400',
        badgeColor: 'text-slate-400',
      };
    }
    if (c.segment === 'New') {
      return {
        label: 'New Customer',
        bg: 'bg-cyan-950/80 border-cyan-800/80 text-cyan-400',
        badgeColor: 'text-cyan-400',
      };
    }
    return {
      label: 'Good Standing',
      bg: 'bg-emerald-950/80 border-emerald-800/80 text-emerald-400',
      badgeColor: 'text-emerald-400',
    };
  };

  if (!isAllowed) {
    return (
      <LockedFeatureGate
        feature="customers"
        subscription={effectiveSubscription}
        business={effectiveBusiness}
        isMasterAdmin={effectiveMasterAdmin}
        onNavigateToUpgrade={onNavigateToUpgrade || (() => {})}
      >
        <div />
      </LockedFeatureGate>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Feedback Toast / Alert Banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border transition ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/90 border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="p-1 hover:bg-black/30 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>Customer Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Maintain customer records, purchase histories, and credit limits
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCustomers}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition disabled:opacity-50"
            title="Refresh customers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            id="btn-customer-intelligence"
            onClick={() => setIntelligenceModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-emerald-800/80 hover:border-emerald-500 text-emerald-400 hover:text-emerald-300 font-bold text-xs shadow-md transition active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Customer Intelligence</span>
          </button>

          <button
            id="btn-add-new-customer"
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Customer</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
              Total Customers
            </span>
            <p className="text-xl font-black text-white mt-1">{stats.totalCustomers}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
              Active Debtors
            </span>
            <p className="text-xl font-black text-amber-400 mt-1">{stats.debtorsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
              Total Outstanding Debt
            </span>
            <p className="text-xl font-black text-rose-400 mt-1">
              {currency} {stats.totalDebt.toFixed(2)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
              Lifetime Sales Sum
            </span>
            <p className="text-xl font-black text-emerald-400 mt-1">
              {currency} {stats.totalPurchases.toFixed(2)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Segment Quick Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
          Segments:
        </span>
        {[
          { id: 'all', label: 'All Customers' },
          { id: 'active', label: 'Active (30d)' },
          { id: 'new', label: 'New' },
          { id: 'frequent', label: 'Frequent (≥3)' },
          { id: 'high_value', label: 'High Value' },
          { id: 'inactive', label: 'Inactive (>30d)' },
          { id: 'debt', label: 'Debtors' },
          { id: 'credit_risk', label: 'Credit Risk' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id as any)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
              statusFilter === tab.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search, Status Filters & Sorting */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            id="customer-search-input"
            type="text"
            placeholder="Search customers by name, phone, email, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter by Status */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all">All Segments & Statuses</option>
            <option value="good">Good Standing (No Debt)</option>
            <option value="debt">Has Debt / Balance</option>
            <option value="limit_reached">Credit Limit Reached</option>
            <option value="active">Active (Recent Purchase)</option>
            <option value="new">New Customer</option>
            <option value="frequent">Frequent Buyer (≥3 Sales)</option>
            <option value="high_value">High Value</option>
            <option value="inactive">Inactive (&gt;30 Days)</option>
            <option value="credit_risk">Credit Risk</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
          >
            <option value="name_asc">Name: A to Z</option>
            <option value="name_desc">Name: Z to A</option>
            <option value="debt_desc">Highest Debt</option>
            <option value="purchases_desc">Lifetime Purchases (CLV)</option>
            <option value="transactions_desc">Most Transactions</option>
            <option value="inactive_desc">Longest Inactivity</option>
            <option value="newest">Recently Registered</option>
          </select>
        </div>
      </div>

      {/* Main Customers List / Table */}
      {loading && customers.length === 0 ? (
        <div className="p-12 text-center text-slate-500 space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
          <p className="text-xs">Loading customer directory...</p>
        </div>
      ) : filteredAndSortedCustomers.length > 0 ? (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Phone & WhatsApp</th>
                    <th className="py-3.5 px-4">Segment</th>
                    <th className="py-3.5 px-4">Orders & ATV</th>
                    <th className="py-3.5 px-4">Total Purchases (CLV)</th>
                    <th className="py-3.5 px-4">Debt / Limit</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAndSortedCustomers.map((c) => {
                    const status = getCustomerStatus(c);
                    const cleanPhone = c.phone.replace(/\D/g, '');
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-800/40 transition group cursor-pointer"
                        onClick={() => openCustomerProfile(c.id)}
                      >
                        {/* Customer Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-2xl bg-slate-800 text-emerald-400 border border-slate-700/60 flex items-center justify-center font-bold text-xs shrink-0">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="truncate max-w-[170px]">
                              <p className="font-bold text-white group-hover:text-emerald-300 transition truncate">
                                {c.name}
                              </p>
                              {c.email ? (
                                <p className="text-[11px] text-slate-400 truncate">{c.email}</p>
                              ) : (
                                <p className="text-[10px] text-slate-500 font-mono">
                                  {c.daysSinceLastPurchase !== undefined
                                    ? `Active ${c.daysSinceLastPurchase}d ago`
                                    : 'Registered'}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-300">{c.phone}</span>
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded-lg bg-emerald-950/80 text-emerald-400 hover:bg-emerald-800 transition"
                                title="Send WhatsApp Message"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Segment Badge */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${status.bg}`}>
                            {c.segment || status.label}
                          </span>
                        </td>

                        {/* Orders & ATV */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="text-slate-200 font-semibold text-xs">
                            {c.transactionCount || 0} orders
                          </div>
                          <span className="text-[10px] text-slate-400">
                            ATV: {currency} {(c.averageTransactionValue || 0).toFixed(2)}
                          </span>
                        </td>

                        {/* Total Purchases (CLV) */}
                        <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono">
                          {currency} {(c.totalPurchases || 0).toFixed(2)}
                        </td>

                        {/* Debt / Limit */}
                        <td className="py-3.5 px-4 font-mono">
                          {(c.currentDebt || 0) > 0 ? (
                            <span className="text-amber-400 font-bold block">
                              {currency} {(c.currentDebt || 0).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-500 block">{currency} 0.00</span>
                          )}
                          <span className="text-[10px] text-slate-500">
                            Limit: {c.creditLimit && c.creditLimit > 0 ? `${currency} ${c.creditLimit.toFixed(2)}` : 'None'}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              (c.currentDebt || 0) > 0
                                ? (c.creditLimit && (c.currentDebt || 0) > c.creditLimit)
                                  ? 'bg-rose-950/80 border-rose-800/80 text-rose-400'
                                  : 'bg-amber-950/80 border-amber-800/80 text-amber-400'
                                : 'bg-emerald-950/80 border-emerald-800/80 text-emerald-400'
                            }`}
                          >
                            {(c.currentDebt || 0) > 0 ? 'Debt Active' : 'Clear'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3.5 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => openCustomerProfile(c.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                            >
                              Profile
                            </button>

                            <button
                              onClick={() => openEditModal(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                              title="Edit Customer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setCustomerToDelete(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Grid View */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {filteredAndSortedCustomers.map((c) => {
              const status = getCustomerStatus(c);
              const cleanPhone = c.phone.replace(/\D/g, '');
              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-800 text-emerald-400 border border-slate-700/60 flex items-center justify-center font-bold text-sm shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white leading-tight">{c.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {c.phone}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${status.bg}`}>
                            {c.segment || status.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${status.bg}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Financial Mini Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Lifetime Spend</span>
                      <p className="font-bold text-white font-mono mt-0.5">
                        {currency} {(c.totalPurchases || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Orders / ATV</span>
                      <p className="font-bold text-slate-300 font-mono mt-0.5 text-[11px]">
                        {c.transactionCount || 0} • {currency} {(c.averageTransactionValue || 0).toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Current Debt</span>
                      <p
                        className={`font-bold font-mono mt-0.5 ${
                          (c.currentDebt || 0) > 0 ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        {currency} {(c.currentDebt || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {c.address && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => openCustomerProfile(c.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition text-center"
                    >
                      View Profile & History
                    </button>

                    {cleanPhone && (
                      <a
                        href={`https://wa.me/${cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 hover:bg-emerald-800 transition flex items-center justify-center shrink-0"
                        title="WhatsApp chat"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      onClick={() => openEditModal(c)}
                      className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
                      title="Edit Customer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setCustomerToDelete(c)}
                      className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 transition shrink-0"
                      title="Delete Customer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 text-center text-slate-500 bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <h4 className="text-sm font-bold text-slate-300">No customers found</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'No customers match your current filter criteria.'
              : 'Add your regular customers to keep track of their purchases and store credits.'}
          </p>
          <button
            id="btn-add-first-customer"
            onClick={openAddModal}
            className="mt-4 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ ADD FIRST CUSTOMER</span>
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* 1. ADD / EDIT CUSTOMER MODAL */}
      {/* ==================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingCustomer
                      ? 'Update customer details and credit preferences'
                      : 'Create a permanent record in your customer directory'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Customer Full Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  id="input-customer-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kwame Test or Abena Serwaa"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ghana Phone Number (WhatsApp) <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    id="input-customer-phone"
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0240000000 or 0244123456"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    id="input-customer-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kwame@example.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Credit Limit ({currency}) <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    id="input-customer-credit-limit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Location / Physical Address <span className="text-slate-500">(Optional)</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    id="input-customer-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Osu Oxford Street, Accra"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes & Credit Terms <span className="text-slate-500">(Optional)</span>
                </label>
                <textarea
                  id="input-customer-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Regular wholesale buyer, pays monthly via MoMo"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-customer"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-md shadow-emerald-950/40 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : editingCustomer ? (
                    'Update Customer'
                  ) : (
                    'Add Customer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. CUSTOMER PROFILE & STATEMENT MODAL */}
      {/* ==================================================== */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/60">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 flex items-center justify-center font-bold text-lg">
                  {statement?.customer.name.charAt(0).toUpperCase() || 'C'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">
                      {statement?.customer.name || 'Customer Statement'}
                    </h3>
                    {statement?.customer && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          getCustomerStatus(statement.customer).bg
                        }`}
                      >
                        {getCustomerStatus(statement.customer).label}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="font-mono flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      {statement?.customer.phone}
                    </span>
                    {statement?.customer.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        {statement.customer.email}
                      </span>
                    )}
                    {statement?.customer.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {statement.customer.address}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {(statement?.currentDebt || 0) > 0 && (
                  <button
                    onClick={() => openRecordPaymentModal(statement.customer)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-1"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Pay Debt</span>
                  </button>
                )}
                {statement?.customer.phone && (
                  <button
                    onClick={() => {
                      if ((statement.currentDebt || 0) > 0) {
                        openWhatsAppDebtReminder(
                          statement.customer,
                          statement.currentDebt || 0,
                          business,
                          statement.sales.find((s) => s.balance > 0)?.receiptNumber
                        );
                      } else {
                        const cleanPhone = formatGhanaPhone(statement.customer.phone);
                        window.open(`https://wa.me/${cleanPhone}`, '_blank');
                      }
                    }}
                    className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 hover:bg-emerald-800 transition"
                    title="WhatsApp Customer"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                )}
                {statement?.customer && (
                  <button
                    onClick={() => openEditModal(statement.customer)}
                    className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
                    title="Edit Customer Details"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setProfileOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {profileLoading ? (
              <div className="p-16 text-center text-slate-500 space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
                <p className="text-xs">Loading customer statement & ledger...</p>
              </div>
            ) : statement ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Intelligence & Financial 5-Box Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Lifetime Purchases (CLV)
                    </span>
                    <p className="text-base font-black text-white font-mono mt-1">
                      {currency} {(statement.totalPurchases || 0).toFixed(2)}
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {statement.customer.transactionCount || statement.sales.length} orders
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Average Order (ATV)
                    </span>
                    <p className="text-base font-black text-blue-400 font-mono mt-1">
                      {currency} {(statement.customer.averageTransactionValue || 0).toFixed(2)}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      Per transaction avg
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Total Amount Paid
                    </span>
                    <p className="text-base font-black text-emerald-400 font-mono mt-1">
                      {currency} {(statement.totalPaid || 0).toFixed(2)}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      Settled receipts
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Outstanding Debt
                    </span>
                    <p
                      className={`text-base font-black font-mono mt-1 ${
                        (statement.currentDebt || 0) > 0 ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      {currency} {(statement.currentDebt || 0).toFixed(2)}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      Credit Limit: {statement.customer.creditLimit && statement.customer.creditLimit > 0 ? `${currency} ${statement.customer.creditLimit.toFixed(2)}` : 'None'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Activity Status
                    </span>
                    <p className="text-sm font-bold text-slate-200 mt-1">
                      {statement.customer.segment || 'Customer'}
                    </p>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {statement.customer.daysSinceLastPurchase !== undefined
                        ? statement.customer.daysSinceLastPurchase === 0
                          ? 'Active Today'
                          : `${statement.customer.daysSinceLastPurchase}d inactive`
                        : 'No orders yet'}
                    </span>
                  </div>
                </div>

                {/* Profile Tabs */}
                <div className="flex items-center border-b border-slate-800 gap-4 text-xs font-bold">
                  <button
                    onClick={() => setProfileTab('purchases')}
                    className={`pb-2.5 transition border-b-2 ${
                      profileTab === 'purchases'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    Purchase History ({statement.sales.length})
                  </button>
                  <button
                    onClick={() => setProfileTab('payments')}
                    className={`pb-2.5 transition border-b-2 ${
                      profileTab === 'payments'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    Debt Payments ({statement.payments.length})
                  </button>
                  <button
                    onClick={() => setProfileTab('notes')}
                    className={`pb-2.5 transition border-b-2 ${
                      profileTab === 'notes'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    CRM Notes & Logs
                  </button>
                  <button
                    onClick={() => {
                      setProfileTab('communications');
                      if (statement?.customer?.id) loadCustomerComms(statement.customer.id);
                    }}
                    className={`pb-2.5 transition border-b-2 flex items-center space-x-1.5 ${
                      profileTab === 'communications'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Communications & WhatsApp ({customerComms.length})</span>
                  </button>
                </div>

                {/* Tab 1: Purchases */}
                {profileTab === 'purchases' && (
                  <div className="space-y-3">
                    {/* Purchases Search & Date Filter */}
                    {statement.sales.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <div className="relative flex-1 w-full">
                          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Filter sales by receipt or product..."
                            value={purchaseFilterQuery}
                            onChange={(e) => setPurchaseFilterQuery(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                          />
                        </div>
                        <input
                          type="date"
                          value={purchaseFilterDate}
                          onChange={(e) => setPurchaseFilterDate(e.target.value)}
                          className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                        />
                        {(purchaseFilterQuery || purchaseFilterDate) && (
                          <button
                            onClick={() => {
                              setPurchaseFilterQuery('');
                              setPurchaseFilterDate('');
                            }}
                            className="text-xs text-slate-400 hover:text-white px-2 py-1"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    )}

                    {statement.sales.length > 0 ? (
                      <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950">
                            <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400">
                              <th className="p-3">Receipt</th>
                              <th className="p-3">Date</th>
                              <th className="p-3">Items</th>
                              <th className="p-3">Method</th>
                              <th className="p-3">Total</th>
                              <th className="p-3">Paid</th>
                              <th className="p-3">Balance</th>
                              <th className="p-3 text-right">View</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono">
                            {statement.sales
                              .filter((s) => {
                                const q = purchaseFilterQuery.toLowerCase().trim();
                                const matchesQ =
                                  !q ||
                                  s.receiptNumber.toLowerCase().includes(q) ||
                                  s.items.some((i) => i.productName.toLowerCase().includes(q));
                                const matchesDate =
                                  !purchaseFilterDate ||
                                  s.createdAt.startsWith(purchaseFilterDate);
                                return matchesQ && matchesDate;
                              })
                              .map((s) => (
                              <tr key={s.id} className="hover:bg-slate-800/30">
                                <td className="p-3 font-bold text-emerald-400">
                                  {s.receiptNumber}
                                </td>
                                <td className="p-3 text-slate-400 font-sans">
                                  {formatAccraDate(s.createdAt)}
                                </td>
                                <td className="p-3 text-slate-300 font-sans max-w-[180px] truncate">
                                  {s.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                                </td>
                                <td className="p-3 text-slate-400 font-sans">{s.paymentMethod}</td>
                                <td className="p-3 font-bold text-white">
                                  {currency} {s.total.toFixed(2)}
                                </td>
                                <td className="p-3 text-emerald-400">
                                  {currency} {s.amountPaid.toFixed(2)}
                                </td>
                                <td className="p-3">
                                  {s.balance > 0 ? (
                                    <span className="text-amber-400 font-bold">
                                      {currency} {s.balance.toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">Paid</span>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  {onOpenReceipt && (
                                    <button
                                      onClick={() => onOpenReceipt(s)}
                                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                                      title="View Receipt"
                                    >
                                      <Receipt className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-10 text-slate-500 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <p className="text-xs font-semibold text-slate-400">
                          No purchases recorded yet
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Sales linked to this customer will automatically appear here.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Payments */}
                {profileTab === 'payments' && (
                  <div>
                    {statement.payments.length > 0 ? (
                      <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950">
                            <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400">
                              <th className="p-3">Payment Date</th>
                              <th className="p-3">Amount</th>
                              <th className="p-3">Method</th>
                              <th className="p-3">Notes & Reference</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono">
                            {statement.payments.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-800/30">
                                <td className="p-3 text-slate-400 font-sans">
                                  {formatAccraDateTime(p.createdAt || p.date)}
                                </td>
                                <td className="p-3 font-bold text-emerald-400">
                                  {currency} {p.amount.toFixed(2)}
                                </td>
                                <td className="p-3 text-slate-300 font-sans">{p.paymentMethod}</td>
                                <td className="p-3 text-slate-400 font-sans">
                                  {p.notes || '-'}
                                  {p.reference ? ` (Ref: ${p.reference})` : ''}
                                  {p.createdByName ? ` • By: ${p.createdByName}` : ''}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-10 text-slate-500 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
                        <Wallet className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <p className="text-xs font-semibold text-slate-400">
                          No debt payment receipts recorded
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Payments made toward customer debts will be listed here.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: CRM Notes */}
                {profileTab === 'notes' && (
                  <div className="space-y-4">
                    {/* Add Note Form */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Add Interaction Note</span>
                      </h5>
                      <textarea
                        rows={2}
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        placeholder="Log customer preference, credit reminder, interaction, call summary..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddCustomerNote}
                          disabled={addingNote || !newNoteText.trim()}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          {addingNote ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Save Note</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Existing Notes Display */}
                    {statement.customer.notes ? (
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                        <h5 className="font-bold text-white text-[11px] uppercase tracking-wider">
                          Notes & History
                        </h5>
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {statement.customer.notes}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/40 border border-slate-800 rounded-2xl">
                        No customer notes recorded yet.
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 4: Communications & WhatsApp */}
                {profileTab === 'communications' && (
                  <div className="space-y-4">
                    {/* Communication Preferences Box */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Outreach Preferences & Privacy</span>
                        </h5>
                        {statement.customer.communicationPreferences?.optedOut && (
                          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 text-[10px] font-bold border border-rose-800/60">
                            Opted Out
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleCustomerPreference(
                              'whatsappAllowed',
                              !(statement.customer.communicationPreferences?.whatsappAllowed ?? true)
                            )
                          }
                          className={`p-2.5 rounded-xl border text-left transition ${
                            statement.customer.communicationPreferences?.whatsappAllowed ?? true
                              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div className="font-bold text-[11px]">WhatsApp</div>
                          <div className="text-[10px]">
                            {statement.customer.communicationPreferences?.whatsappAllowed ?? true
                              ? 'Allowed'
                              : 'Disabled'}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleToggleCustomerPreference(
                              'debtRemindersAllowed',
                              !(statement.customer.communicationPreferences?.debtRemindersAllowed ?? true)
                            )
                          }
                          className={`p-2.5 rounded-xl border text-left transition ${
                            statement.customer.communicationPreferences?.debtRemindersAllowed ?? true
                              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div className="font-bold text-[11px]">Debt Reminders</div>
                          <div className="text-[10px]">
                            {statement.customer.communicationPreferences?.debtRemindersAllowed ?? true
                              ? 'Allowed'
                              : 'Disabled'}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleToggleCustomerPreference(
                              'marketingAllowed',
                              !(statement.customer.communicationPreferences?.marketingAllowed ?? true)
                            )
                          }
                          className={`p-2.5 rounded-xl border text-left transition ${
                            statement.customer.communicationPreferences?.marketingAllowed ?? true
                              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div className="font-bold text-[11px]">Marketing</div>
                          <div className="text-[10px]">
                            {statement.customer.communicationPreferences?.marketingAllowed ?? true
                              ? 'Allowed'
                              : 'Disabled'}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleToggleCustomerPreference(
                              'optedOut',
                              !(statement.customer.communicationPreferences?.optedOut ?? false)
                            )
                          }
                          className={`p-2.5 rounded-xl border text-left transition ${
                            statement.customer.communicationPreferences?.optedOut
                              ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div className="font-bold text-[11px]">Outreach Opt-Out</div>
                          <div className="text-[10px]">
                            {statement.customer.communicationPreferences?.optedOut
                              ? 'Opted Out'
                              : 'Receiving'}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Quick WhatsApp Outreach Actions */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h5 className="font-bold text-white text-xs uppercase tracking-wider">
                        Quick WhatsApp Outreach (Ghana Links)
                      </h5>

                      <div className="flex flex-wrap gap-2">
                        {(statement.currentDebt || 0) > 0 && (
                          <button
                            type="button"
                            disabled={quickMessageSending}
                            onClick={() => handleSendQuickCustomerMessage('DEBT_REMINDER')}
                            className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center space-x-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>
                              Send Debt Reminder (GH₵ {(statement.currentDebt || 0).toFixed(2)})
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={quickMessageSending}
                          onClick={() => handleSendQuickCustomerMessage('CUSTOMER_APPRECIATION')}
                          className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center space-x-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Send Appreciation Thank-You</span>
                        </button>

                        <button
                          type="button"
                          disabled={quickMessageSending}
                          onClick={() => handleSendQuickCustomerMessage('GENERAL_CUSTOMER_MESSAGE')}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center space-x-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Send General Greeting</span>
                        </button>
                      </div>

                      {/* Custom Quick Message */}
                      <div className="pt-2 border-t border-slate-800/80 space-y-2">
                        <textarea
                          rows={2}
                          value={quickMessageText}
                          onChange={(e) => setQuickMessageText(e.target.value)}
                          placeholder="Or compose a custom WhatsApp message for this customer..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
                        />
                        {quickMessageText.trim() && (
                          <button
                            type="button"
                            disabled={quickMessageSending}
                            onClick={() =>
                              handleSendQuickCustomerMessage(
                                'GENERAL_CUSTOMER_MESSAGE',
                                quickMessageText.trim()
                              )
                            }
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open in WhatsApp</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Customer Communication History */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-white text-xs uppercase tracking-wider">
                        Outreach History ({customerComms.length})
                      </h5>

                      {commsLoading ? (
                        <div className="text-center py-6 text-slate-500 text-xs">
                          Loading communication logs...
                        </div>
                      ) : customerComms.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/40 border border-slate-800 rounded-2xl">
                          No messages or reminders sent to this customer yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {customerComms.map((comm) => (
                            <div
                              key={comm.id}
                              className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-emerald-400">
                                  {comm.type.replace(/_/g, ' ')}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      comm.status === 'OPENED'
                                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                        : comm.status === 'APPROVED'
                                        ? 'bg-sky-950 text-sky-400 border border-sky-800/60'
                                        : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                    }`}
                                  >
                                    {comm.status}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {formatAccraDate(comm.createdAt)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-slate-300 leading-relaxed font-sans">{comm.message}</p>
                              {comm.whatsappUrl && (
                                <div className="flex justify-end pt-1">
                                  <a
                                    href={comm.whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                                  >
                                    <span>Re-open WhatsApp</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Modal Bottom Actions */}
            {statement && (
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Registered:{' '}
                  <span className="text-slate-300 font-medium">
                    {formatAccraDate(statement.customer.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {(statement.currentDebt || 0) > 0 && (
                    <button
                      onClick={() => openRecordPaymentModal(statement.customer)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-amber-950/40 inline-flex items-center justify-center gap-1.5"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  )}

                  {onNavigateToPOS && (
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        onNavigateToPOS(statement.customer.id);
                      }}
                      className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-950/40 inline-flex items-center justify-center gap-1.5"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>New Sale for Customer</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. RECORD CUSTOMER DEBT PAYMENT MODAL */}
      {/* ==================================================== */}
      {paymentModalOpen && statement?.customer && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/80 flex items-center justify-center font-bold">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record Customer Payment</h3>
                  <p className="text-[11px] text-slate-400">
                    Debt settlement for {statement.customer.name}
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

            {paymentError && (
              <div className="mx-6 mt-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Current Outstanding Debt:</span>
                <span className="text-sm font-black text-amber-400 font-mono">
                  {currency} {(statement.customer.currentDebt || 0).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Amount ({currency}) <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono font-bold focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="Mobile Money">Mobile Money (MoMo)</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card / POS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Notes / Transaction ID
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. MTN MoMo Trans ID: 12345678"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-md disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {paymentSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    'Record Payment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repayment Receipt Modal */}
      {receiptModalOpen && currentReceipt && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto animate-fadeIn">
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
                  <span>{formatAccraDateTime(currentReceipt.date)}</span>
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

      {/* ==================================================== */}
      {/* 4. DELETE CONFIRMATION DIALOG */}
      {/* ==================================================== */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 text-rose-400 border border-rose-800/80 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Delete Customer Record</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to remove{' '}
                <span className="font-bold text-white">"{customerToDelete.name}"</span>?
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                Historical sales and receipts linked to this customer will remain intact in your
                records.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shadow-md shadow-rose-950/40 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. CUSTOMER INTELLIGENCE MODAL */}
      {/* ==================================================== */}
      <CustomerIntelligenceModal
        isOpen={intelligenceModalOpen}
        onClose={() => setIntelligenceModalOpen(false)}
        business={effectiveBusiness}
        onSelectCustomer={(id) => openCustomerProfile(id)}
      />
    </div>
  );
};
