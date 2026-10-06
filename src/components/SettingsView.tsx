import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  User as UserIcon,
  CreditCard,
  History,
  Lock,
  Phone,
  Mail,
  MapPin,
  Image,
  CheckCircle2,
  AlertCircle,
  Check,
  ShieldCheck,
  Zap,
  ExternalLink,
  Calendar,
  Sparkles,
  RefreshCw,
  Loader2,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Trash2,
  Shield,
  MessageSquare,
  Send,
  Smartphone,
  CheckCheck,
  Info,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { BUSINESS_TYPES } from './AuthModal.js';
import { LockedFeatureGate } from './LockedFeatureGate.js';
import { canAccessFeature } from '../utils/featureAccess.js';
import { StaffIntelligenceModal } from './StaffIntelligenceModal.js';
import { BusinessGovernanceCenter } from './BusinessGovernanceCenter.js';
import { openWhatsApp, generateReceiptWhatsAppMessage, formatGhanaPhone } from '../utils/whatsapp.js';
import type {
  Business,
  User,
  AuditLog,
  BusinessType,
  SubscriptionPlan,
  Subscription,
  SubscriptionPayment,
  StaffPermissions,
  BusinessSettings,
  BillingInvoice,
  SubscriptionUsageSummary,
} from '../types/index.js';
import { DEFAULT_STAFF_PERMISSIONS } from '../types/index.js';

const PERMISSION_GROUPS: {
  name: string;
  permissions: {
    key: keyof StaffPermissions;
    label: string;
    description: string;
  }[];
}[] = [
  {
    name: 'GENERAL',
    permissions: [
      { key: 'dashboard', label: 'Dashboard', description: 'View business summary, daily sales charts, and quick statistics' },
      { key: 'notifications', label: 'Notifications', description: 'View and receive activity alerts' },
    ],
  },
  {
    name: 'SALES',
    permissions: [
      { key: 'pos_sales', label: 'Sales / POS', description: 'Access cash register, record sales, and issue receipts' },
    ],
  },
  {
    name: 'PRODUCTS',
    permissions: [
      { key: 'view_products', label: 'View Products', description: 'Browse product catalog, prices, and stock levels' },
      { key: 'manage_products', label: 'Manage Products', description: 'Add, edit, adjust prices, and delete products' },
    ],
  },
  {
    name: 'CUSTOMERS & DEBT',
    permissions: [
      { key: 'customers', label: 'Customers', description: 'View customer directory and contact information' },
      { key: 'debtors', label: 'Debtors', description: 'Track outstanding balances and record debt payments' },
    ],
  },
  {
    name: 'EXPENSES & SUPPLIERS',
    permissions: [
      { key: 'expenses', label: 'Expenses', description: 'Record and track store operational expenditures' },
      { key: 'suppliers', label: 'Suppliers', description: 'View and manage supplier/vendor records' },
      { key: 'purchases', label: 'Purchases / Stock-In', description: 'Record incoming supplier shipments and stock replenishment' },
    ],
  },
  {
    name: 'INVOICING & REPORTING',
    permissions: [
      { key: 'invoices', label: 'Invoices', description: 'Generate and send professional customer invoices' },
      { key: 'financial_reports', label: 'Financial Reports', description: 'Access profit & loss, sales summaries, and tax reports' },
    ],
  },
  {
    name: 'BUSINESS',
    permissions: [
      { key: 'business_settings', label: 'Business Settings', description: 'Configure business profile, logo, and receipt settings' },
    ],
  },
];

interface SettingsViewProps {
  business: Business | null;
  user: User | null;
  initialTab?: 'business' | 'account' | 'subscription' | 'audit' | 'staff' | 'governance' | 'whatsapp';
  onSettingsUpdated?: (settings: BusinessSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  business,
  user,
  initialTab,
  onSettingsUpdated,
}) => {
  const { subscription: authSubscription, updateBusinessState, updateUserState, refreshAuth } = useAuth();
  const isBusinessOwner = user?.role === 'business_owner';
  const isStaff = user?.role === 'staff';

  const [activeTab, setActiveTab] = useState<'business' | 'account' | 'subscription' | 'audit' | 'staff' | 'governance' | 'whatsapp'>(
    isStaff ? 'account' : (initialTab || 'business')
  );

  useEffect(() => {
    if (isStaff) {
      setActiveTab('account');
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isStaff]);

  const isMasterAdmin =
    Boolean(user) &&
    (user?.role === 'admin' ||
      user?.role === 'master_admin' ||
      user?.id === 'usr_admin_master' ||
      user?.email?.toLowerCase() === 'admin@businessmanagergh.com');

  // Business Form
  const [bizName, setBizName] = useState(business?.name || '');
  const [bizType, setBizType] = useState<BusinessType>(business?.type || 'Provision Shop');
  const [bizLocation, setBizLocation] = useState(business?.location || '');
  const [bizPhone, setBizPhone] = useState(business?.phone || '');
  const [bizEmail, setBizEmail] = useState(business?.email || '');
  const [bizLogo, setBizLogo] = useState(business?.logo || '');
  const [bizReceiptNote, setBizReceiptNote] = useState(business?.receiptNote || '');

  // User Account Form
  const [userName, setUserName] = useState(user?.fullName || '');
  const [userPhone, setUserPhone] = useState(user?.phone || '');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Subscription & Paystack State
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const effectiveSubscription = subscription || authSubscription;
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [billingInvoices, setBillingInvoices] = useState<BillingInvoice[]>([]);
  const [subUsage, setSubUsage] = useState<SubscriptionUsageSummary | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [paystackConfigured, setPaystackConfigured] = useState(true);
  const [initiatingPlan, setInitiatingPlan] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [subTabError, setSubTabError] = useState<string>('');

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Staff & Team State
  const [staffList, setStaffList] = useState<User[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffFullName, setStaffFullName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffPermissions, setStaffPermissions] = useState<StaffPermissions>({ ...DEFAULT_STAFF_PERMISSIONS });
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [staffModalError, setStaffModalError] = useState('');

  // Edit Staff State
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [editStaffFullName, setEditStaffFullName] = useState('');
  const [editStaffPhone, setEditStaffPhone] = useState('');
  const [editStaffPassword, setEditStaffPassword] = useState('');
  const [editStaffPermissions, setEditStaffPermissions] = useState<StaffPermissions>({ ...DEFAULT_STAFF_PERMISSIONS });
  const [editStaffSubmitting, setEditStaffSubmitting] = useState(false);
  const [editStaffModalError, setEditStaffModalError] = useState('');
  const [showStaffIntelligenceModal, setShowStaffIntelligenceModal] = useState(false);
  const [selectedStaffIntelligenceId, setSelectedStaffIntelligenceId] = useState<string | undefined>(undefined);

  // WhatsApp Integration & Business Settings State
  const [bizSettings, setBizSettings] = useState<BusinessSettings | null>(null);
  const [enableWhatsappReceipts, setEnableWhatsappReceipts] = useState<boolean>(true);
  const [enableWhatsappReminders, setEnableWhatsappReminders] = useState<boolean>(true);
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  const [whatsappTestSuccess, setWhatsappTestSuccess] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currency = business?.currency || 'GH₵';

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const data = await api.getSettings();
      if (data?.settings) {
        setBizSettings(data.settings);
        setEnableWhatsappReceipts(data.settings.enableWhatsappReceipts ?? true);
        setEnableWhatsappReminders(data.settings.enableWhatsappReminders ?? true);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    if (isBusinessOwner || isMasterAdmin) {
      loadSettings();
    }
  }, [isBusinessOwner, isMasterAdmin]);

  const handleToggleWhatsappReceipts = async (enabled: boolean) => {
    setEnableWhatsappReceipts(enabled);
    try {
      setWhatsappSaving(true);
      const res = await api.updateSettings({
        settings: {
          enableWhatsappReceipts: enabled,
        },
      });
      if (res?.settings) {
        setBizSettings(res.settings);
        if (onSettingsUpdated) onSettingsUpdated(res.settings);
      }
      setSuccessMsg(
        enabled
          ? 'Automatic customer receipt delivery via WhatsApp enabled!'
          : 'Automatic customer receipt delivery via WhatsApp disabled.'
      );
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setEnableWhatsappReceipts(!enabled);
      setError(err.message || 'Failed to update WhatsApp receipt settings.');
    } finally {
      setWhatsappSaving(false);
    }
  };

  const handleToggleWhatsappReminders = async (enabled: boolean) => {
    setEnableWhatsappReminders(enabled);
    try {
      setWhatsappSaving(true);
      const res = await api.updateSettings({
        settings: {
          enableWhatsappReminders: enabled,
        },
      });
      if (res?.settings) {
        setBizSettings(res.settings);
        if (onSettingsUpdated) onSettingsUpdated(res.settings);
      }
      setSuccessMsg(
        enabled
          ? 'Automatic WhatsApp payment reminders enabled!'
          : 'Automatic WhatsApp payment reminders disabled.'
      );
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setEnableWhatsappReminders(!enabled);
      setError(err.message || 'Failed to update WhatsApp reminder settings.');
    } finally {
      setWhatsappSaving(false);
    }
  };

  const handleSendTestReceipt = () => {
    const sampleSale: any = {
      id: 'test_sample',
      receiptNumber: 'REC-DEMO-001',
      customerName: 'Valued Customer',
      customerPhone: bizPhone || '0240000000',
      items: [
        { productName: 'Ideal Evaporated Milk 160g', quantity: 2, unitPrice: 7, total: 14 },
        { productName: 'Milo Cocoa Refill 400g', quantity: 1, unitPrice: 45, total: 45 },
      ],
      subtotal: 59,
      discount: 0,
      total: 59,
      amountPaid: 59,
      balance: 0,
      paymentMethod: 'Cash',
      createdAt: new Date().toISOString(),
    };
    const sampleBiz: any = {
      name: bizName || business?.name || 'My Business',
      phone: bizPhone || business?.phone || '',
      location: bizLocation || business?.location || 'Accra, Ghana',
      currency: currency || 'GH₵',
      receiptNote: bizReceiptNote || business?.receiptNote || 'Thank you for shopping with us! Medaase.',
    };
    const msg = generateReceiptWhatsAppMessage(sampleSale, sampleBiz);
    openWhatsApp(bizPhone || '', msg);
    setWhatsappTestSuccess(true);
    setTimeout(() => setWhatsappTestSuccess(false), 4000);
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      const canViewAudit = canAccessFeature(effectiveSubscription, 'audit_logs', isMasterAdmin, business);
      if (canViewAudit) {
        loadAuditLogs();
      }
    }
    if (activeTab === 'subscription') {
      loadSubscriptionData();
    }
    if (activeTab === 'staff' && isBusinessOwner) {
      loadStaffList();
    }
  }, [activeTab, effectiveSubscription, isMasterAdmin, business, isBusinessOwner]);

  const loadStaffList = async () => {
    try {
      setStaffLoading(true);
      setError('');
      const res = await api.getStaff();
      setStaffList(res.staff || []);
    } catch (err: any) {
      console.error('Failed to load staff list:', err);
      setError(err.message || 'Failed to load staff list.');
    } finally {
      setStaffLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffModalError('');
    if (!staffFullName.trim() || !staffEmail.trim() || !staffPassword.trim()) {
      setStaffModalError('Full name, email, and initial password are required.');
      return;
    }
    if (staffPassword.length < 6) {
      setStaffModalError('Initial password must be at least 6 characters.');
      return;
    }

    try {
      setStaffSubmitting(true);
      const res = await api.createStaff({
        fullName: staffFullName.trim(),
        email: staffEmail.trim(),
        phone: staffPhone.trim() || undefined,
        password: staffPassword,
        permissions: staffPermissions,
      });

      setStaffList((prev) => [res.staff, ...prev]);
      setShowAddStaffModal(false);
      setStaffFullName('');
      setStaffEmail('');
      setStaffPhone('');
      setStaffPassword('');
      setStaffPermissions({ ...DEFAULT_STAFF_PERMISSIONS });
      setSuccessMsg(`Staff member ${res.staff.fullName} added successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setStaffModalError(err.message || 'Failed to add staff member.');
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleOpenEditStaffModal = (member: User) => {
    setEditingStaff(member);
    setEditStaffFullName(member.fullName || '');
    setEditStaffPhone(member.phone || '');
    setEditStaffPassword('');
    const initialPerms = member.permissions
      ? { ...DEFAULT_STAFF_PERMISSIONS, ...member.permissions }
      : { ...DEFAULT_STAFF_PERMISSIONS };
    setEditStaffPermissions(initialPerms);
    setEditStaffModalError('');
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setEditStaffModalError('');

    if (!editStaffFullName.trim()) {
      setEditStaffModalError('Full name is required.');
      return;
    }
    if (editStaffPassword && editStaffPassword.length < 6) {
      setEditStaffModalError('New password must be at least 6 characters.');
      return;
    }

    try {
      setEditStaffSubmitting(true);
      const res = await api.updateStaff(editingStaff.id, {
        fullName: editStaffFullName.trim(),
        phone: editStaffPhone.trim() || undefined,
        password: editStaffPassword.trim() ? editStaffPassword.trim() : undefined,
        permissions: editStaffPermissions,
      });

      setStaffList((prev) =>
        prev.map((s) => (s.id === editingStaff.id ? res.staff : s))
      );
      setEditingStaff(null);
      setSuccessMsg(`Permissions and details for ${res.staff.fullName} updated successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setEditStaffModalError(err.message || 'Failed to update staff permissions.');
    } finally {
      setEditStaffSubmitting(false);
    }
  };

  const renderPermissionsSection = (
    permissions: StaffPermissions,
    setPermissions: React.Dispatch<React.SetStateAction<StaffPermissions>>
  ) => {
    const activeCount = Object.values(permissions).filter(Boolean).length;

    const handleSelectAll = () => {
      const allEnabled: StaffPermissions = {
        dashboard: true,
        pos_sales: true,
        view_products: true,
        manage_products: true,
        customers: true,
        debtors: true,
        expenses: true,
        suppliers: true,
        purchases: true,
        invoices: true,
        financial_reports: true,
        notifications: true,
        business_settings: true,
      };
      setPermissions(allEnabled);
    };

    const handleClearAll = () => {
      const allDisabled: StaffPermissions = {
        dashboard: false,
        pos_sales: false,
        view_products: false,
        manage_products: false,
        customers: false,
        debtors: false,
        expenses: false,
        suppliers: false,
        purchases: false,
        invoices: false,
        financial_reports: false,
        notifications: false,
        business_settings: false,
      };
      setPermissions(allDisabled);
    };

    const handleToggle = (key: keyof StaffPermissions) => {
      setPermissions((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    };

    return (
      <div className="space-y-3 pt-3 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Permissions</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 ml-1">
                {activeCount} of 13 active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Choose what this staff member can access.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.name} className="space-y-1.5">
              <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {group.name}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.permissions.map((perm) => {
                  const isChecked = !!permissions[perm.key];
                  return (
                    <label
                      key={perm.key}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                        isChecked
                          ? 'bg-emerald-950/30 border-emerald-800/80 text-white'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggle(perm.key)}
                        className="mt-0.5 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-slate-900"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-semibold ${isChecked ? 'text-emerald-300' : 'text-slate-300'}`}>
                          {perm.label}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-snug mt-0.5">
                          {perm.description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleToggleStaffStatus = async (staffMember: User) => {
    const newStatus = staffMember.status === 'inactive' ? 'active' : 'inactive';
    const actionLabel = newStatus === 'active' ? 'activate' : 'deactivate';

    try {
      setSaving(true);
      setError('');
      const res = await api.updateStaff(staffMember.id, { status: newStatus });
      setStaffList((prev) =>
        prev.map((s) => (s.id === staffMember.id ? { ...s, status: res.staff.status } : s))
      );
      setSuccessMsg(
        newStatus === 'active'
          ? `Staff member ${staffMember.fullName} has been activated.`
          : `Staff member ${staffMember.fullName} has been deactivated. Active sessions are terminated.`
      );
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message || `Failed to ${actionLabel} staff member.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async (staffMember: User) => {
    if (
      !window.confirm(
        `Are you sure you want to revoke access and delete staff member ${staffMember.fullName}? All active sessions will be terminated immediately.`
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      await api.deleteStaff(staffMember.id);
      setStaffList((prev) => prev.filter((s) => s.id !== staffMember.id));
      setSuccessMsg(`Access revoked and removed staff member ${staffMember.fullName}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete staff member.');
    } finally {
      setSaving(false);
    }
  };

  const loadSubscriptionData = async () => {
    try {
      setSubLoading(true);
      const [subRes, paymentsRes, invoicesRes, usageRes] = await Promise.all([
        api.getCurrentSubscription().catch(() => null),
        api.getSubscriptionPayments().catch(() => []),
        api.getBillingInvoices().catch(() => []),
        api.getSubscriptionUsage().catch(() => null),
      ]);

      if (subRes) {
        setSubscription(subRes.subscription);
        setPaystackConfigured(subRes.isPaystackConfigured);
      }
      setPayments(paymentsRes || []);
      setBillingInvoices(invoicesRes || []);
      if (usageRes) {
        setSubUsage(usageRes);
      }
    } catch (err: any) {
      console.error('Failed to load subscription data:', err);
    } finally {
      setSubLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setAuditLoading(true);
      setError('');
      const logs = await api.getAuditLogs();
      setAuditLogs(logs || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim()) {
      setError('Business name is required.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const res = await api.updateSettings({
        business: {
          name: bizName.trim(),
          type: bizType,
          location: bizLocation.trim(),
          phone: bizPhone.trim(),
          email: bizEmail.trim(),
          logo: bizLogo.trim(),
          receiptNote: bizReceiptNote.trim(),
        },
        settings: {
          enableWhatsappReceipts,
          enableWhatsappReminders,
        },
      });
      if (res.business) updateBusinessState(res.business);
      if (res.settings) {
        setBizSettings(res.settings);
        if (onSettingsUpdated) onSettingsUpdated(res.settings);
      }
      setSuccessMsg('Business settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save business settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUserAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const res = await api.updateUserProfile({
        fullName: userName.trim(),
        phone: userPhone.trim(),
        oldPassword: oldPassword || undefined,
        newPassword: newPassword || undefined,
      });
      updateUserState(res.user);
      setOldPassword('');
      setNewPassword('');
      setSuccessMsg('Account details and credentials updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update account.');
    } finally {
      setSaving(false);
    }
  };

  const handlePaystackUpgrade = async (plan: 'starter' | 'business') => {
    try {
      setInitiatingPlan(plan);
      setError('');
      setSubTabError('');
      setSuccessMsg('');
      setCheckoutUrl(null);

      const res = await api.initializeSubscriptionPayment({
        plan,
      });

      if (res.authorizationUrl) {
        setCheckoutUrl(res.authorizationUrl);
        setSuccessMsg(
          `Opening Paystack checkout for ${plan === 'starter' ? 'Starter (GH₵49)' : 'Business (GH₵99)'}...`
        );

        // Attempt top-level or new-tab navigation for iframe resilience
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = res.authorizationUrl;
          } else {
            window.location.href = res.authorizationUrl;
          }
        } catch {
          window.open(res.authorizationUrl, '_blank');
        }
      } else {
        throw new Error('No authorization URL received from payment service.');
      }
    } catch (err: any) {
      console.error('Paystack initiation failed:', err);
      const msg =
        err.message ||
        'Failed to initialize Paystack checkout. Please verify server configuration or try again.';
      setError(msg);
      setSubTabError(msg);
    } finally {
      setInitiatingPlan(null);
    }
  };

  const handleSwitchToFree = async () => {
    try {
      setSaving(true);
      setError('');
      const res = await api.upgradeSubscription('FREE');
      await refreshAuth();
      await loadSubscriptionData();
      setSuccessMsg('Successfully switched to Free Plan.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to switch plan.');
    } finally {
      setSaving(false);
    }
  };

  const currentPlanNormalized = (subscription?.plan || business?.plan || 'Free')
    .toString()
    .toLowerCase();

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Settings & Business Profile
          </h1>
          <p className="text-xs text-slate-400">
            Manage your shop identity, password security, receipts, and subscription plan
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
        {!isStaff && (
          <button
            onClick={() => setActiveTab('business')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'business'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Business Profile</span>
          </button>
        )}

        {!isStaff && (
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Integration</span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                enableWhatsappReceipts ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
              title={enableWhatsappReceipts ? 'Automatic WhatsApp receipts active' : 'Automatic WhatsApp receipts disabled'}
            />
          </button>
        )}

        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
            activeTab === 'account'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>User & Security</span>
        </button>

        {isBusinessOwner && (
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'staff'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff & Team</span>
          </button>
        )}

        {!isStaff && (
          <button
            onClick={() => setActiveTab('subscription')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'subscription'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Subscription Plan</span>
          </button>
        )}

        {!isStaff && (
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'audit'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Logs</span>
            {!canAccessFeature(effectiveSubscription, 'audit_logs', isMasterAdmin, business) && (
              <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-slate-950/80 border border-amber-500/40 text-amber-400 font-semibold">
                <Lock className="w-2.5 h-2.5" />
                <span>Business</span>
              </span>
            )}
          </button>
        )}

        {isBusinessOwner && (
          <button
            onClick={() => setActiveTab('governance')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === 'governance'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Governance & Control</span>
            {!canAccessFeature(effectiveSubscription, 'governance', isMasterAdmin, business) && (
              <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-slate-950/80 border border-amber-500/40 text-amber-400 font-semibold">
                <Lock className="w-2.5 h-2.5" />
                <span>Business</span>
              </span>
            )}
          </button>
        )}
      </div>

      {/* TAB 1: BUSINESS PROFILE */}
      {activeTab === 'business' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white">Business Information</h3>
            <p className="text-xs text-slate-400">
              This information will be printed on customer receipts and billing invoices.
            </p>
          </div>

          <form onSubmit={handleSaveBusiness} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Business / Store Name *
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Business Category *
                </label>
                <select
                  value={bizType}
                  onChange={(e) => setBizType(e.target.value as BusinessType)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                >
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Location (Ghana) *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={bizLocation}
                    onChange={(e) => setBizLocation(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Business Phone (WhatsApp) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={bizPhone}
                    onChange={(e) => setBizPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Business Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={bizEmail}
                    onChange={(e) => setBizEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Logo URL (Optional)
                </label>
                <div className="relative">
                  <Image className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="url"
                    value={bizLogo}
                    onChange={(e) => setBizLogo(e.target.value)}
                    placeholder="https://... logo image link"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Custom Receipt Note / Footer Message
              </label>
              <input
                type="text"
                value={bizReceiptNote}
                onChange={(e) => setBizReceiptNote(e.target.value)}
                placeholder="e.g. Thank you for shopping with us! Medaase."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Business Settings'}
              </button>
            </div>
          </form>

          {/* Quick WhatsApp Receipt & Messaging Section inside Business Profile */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-0.5">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">Automatic Customer Receipt Delivery via WhatsApp</h4>
                    {enableWhatsappReceipts ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Automatically prompt and prepare digital receipts for customer WhatsApp numbers upon checkout completion.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-center">
                <button
                  type="button"
                  role="switch"
                  aria-checked={enableWhatsappReceipts}
                  onClick={() => handleToggleWhatsappReceipts(!enableWhatsappReceipts)}
                  disabled={whatsappSaving}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    enableWhatsappReceipts ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      enableWhatsappReceipts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('whatsapp')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-medium text-xs border border-slate-700 transition"
                >
                  Manage WhatsApp Settings →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: WHATSAPP INTEGRATION & AUTOMATED MESSAGING */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>WhatsApp Integration Settings</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/80 text-[10px] font-bold">
                      Native Web Protocol
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure automated customer receipt delivery, payment reminders, and WhatsApp communication controls.
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400">Shop Phone:</span>
                <span className="font-mono font-semibold text-white">
                  {bizPhone || 'Not Configured'}
                </span>
                {bizPhone ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/60">
                    <Check className="w-2.5 h-2.5" />
                    Verified
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800/60">
                    Missing Phone
                  </span>
                )}
              </div>
            </div>

            {/* CARD 1: PRIMARY USER REQUEST - AUTOMATIC RECEIPT DELIVERY TOGGLE */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-emerald-400" />
                      <span>Automatic Customer Receipt Delivery via WhatsApp</span>
                    </h4>
                    {enableWhatsappReceipts ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Check className="w-3 h-3" /> Active (Auto-Delivery Enabled)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <AlertCircle className="w-3 h-3" /> Disabled (Manual Dispatch Only)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    Enable or disable automated receipt delivery via WhatsApp. When enabled, digital receipts are automatically prepared and prompted for instant WhatsApp dispatch to customers with registered phone numbers upon checkout completion.
                  </p>
                </div>

                {/* THE TOGGLE SWITCH */}
                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  <span className="text-xs font-semibold text-slate-400">
                    {enableWhatsappReceipts ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enableWhatsappReceipts}
                    onClick={() => handleToggleWhatsappReceipts(!enableWhatsappReceipts)}
                    disabled={whatsappSaving}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      enableWhatsappReceipts
                        ? 'bg-emerald-500 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-700'
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        enableWhatsappReceipts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Explanatory Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                <div
                  className={`p-3 rounded-xl border transition ${
                    enableWhatsappReceipts
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <p className="font-bold flex items-center gap-1.5 mb-1 text-white">
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        enableWhatsappReceipts ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    />
                    <span>When Enabled (Recommended)</span>
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Whenever a sale is recorded for a customer with a phone number, the customer’s WhatsApp receipt is automatically generated and queued for direct 1-click delivery. Saves paper costs and speeds up checkout.
                  </p>
                </div>

                <div
                  className={`p-3 rounded-xl border transition ${
                    !enableWhatsappReceipts
                      ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <p className="font-bold flex items-center gap-1.5 mb-1 text-white">
                    <AlertCircle
                      className={`w-3.5 h-3.5 ${
                        !enableWhatsappReceipts ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    />
                    <span>When Disabled</span>
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Automated receipt prompts and delivery banners are suppressed. Cashiers can still view, print, or manually click "WhatsApp" on receipt dialogs when specifically requested by the customer.
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 2: DEBT & DUE DATE REMINDERS TOGGLE */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <History className="w-4 h-4 text-emerald-400" />
                      <span>Automated Debt & Payment Due Date Reminders</span>
                    </h4>
                    {enableWhatsappReminders ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        Paused
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    Enable automated WhatsApp message templates and 1-click reminders for customer credit balances, invoices, and debt collection.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  <span className="text-xs font-semibold text-slate-400">
                    {enableWhatsappReminders ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enableWhatsappReminders}
                    onClick={() => handleToggleWhatsappReminders(!enableWhatsappReminders)}
                    disabled={whatsappSaving}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      enableWhatsappReminders
                        ? 'bg-emerald-500 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-700'
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        enableWhatsappReminders ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 3: LIVE WHATSAPP RECEIPT PREVIEW & TEST DISPATCH */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Live WhatsApp Customer Receipt Preview</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    This simulated preview displays the exact layout and branding your customers will receive via WhatsApp.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSendTestReceipt}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test Receipt to WhatsApp</span>
                </button>
              </div>

              {whatsappTestSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Test receipt opened in WhatsApp! Check your WhatsApp window.</span>
                </div>
              )}

              {/* Chat Bubble Simulator */}
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-700/40 text-emerald-100 font-mono text-[11px] leading-relaxed shadow-sm">
                  <p className="font-bold text-emerald-300">
                    🧾 SALES RECEIPT - {bizName || business?.name || 'MY BUSINESS GH'}
                  </p>
                  <p className="text-[10px] text-emerald-400/90">
                    📍 {bizLocation || business?.location || 'Accra, Ghana'} | 📞 Tel: {bizPhone || business?.phone || '+233...'}
                  </p>
                  <p className="text-slate-500 py-0.5">----------------------------------------</p>
                  <p>Receipt No: <span className="font-bold text-white">REC-DEMO-001</span></p>
                  <p>Date: {new Date().toLocaleDateString('en-GB')}, {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p>Customer: <span className="font-semibold text-white">Valued Customer</span></p>
                  <p className="text-slate-500 py-0.5">----------------------------------------</p>
                  <p className="font-bold text-emerald-300">ITEMS:</p>
                  <p>1. Ideal Evaporated Milk 160g x2 = GH₵14.00</p>
                  <p>2. Milo Cocoa Refill 400g x1 = GH₵45.00</p>
                  <p className="text-slate-500 py-0.5">----------------------------------------</p>
                  <p>Subtotal: GH₵59.00</p>
                  <p className="font-bold text-white text-xs">TOTAL: GH₵59.00</p>
                  <p>Amount Paid: GH₵59.00 (Cash)</p>
                  <p className="font-bold text-emerald-400">✅ Status: Paid in Full</p>
                  <p className="text-slate-500 py-0.5">----------------------------------------</p>
                  <p className="italic text-emerald-300/90">
                    "{bizReceiptNote || business?.receiptNote || 'Thank you for shopping with us! Medaase.'}"
                  </p>
                  <p className="text-[9px] text-emerald-500/70 pt-1">
                    Powered by Business Manager GH
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 4: TIPS & GHANA TELECOM INFO */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs space-y-2 text-slate-400">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Info className="w-4 h-4 text-emerald-400" />
                <span>Zero-Cost WhatsApp Messaging (Ghana Telecom & WhatsApp Web)</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Business Manager GH uses the official WhatsApp Web/App Universal URI scheme (<code className="text-emerald-400">wa.me</code>). Messages are dispatched directly from your browser or smartphone WhatsApp client without third-party per-SMS carrier surcharges, supporting MTN, Telecel, AT, and international numbers seamlessly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER ACCOUNT & SECURITY */}
      {activeTab === 'account' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white">Personal Profile & Password</h3>
            <p className="text-xs text-slate-400">
              Update your staff login name, contact phone, and security credentials.
            </p>
          </div>

          <form onSubmit={handleSaveUserAccount} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
                <input
                  type="text"
                  required
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email Address (Read-only)
              </label>
              <input
                type="email"
                disabled
                value={userEmail}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Change Password</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Update Account & Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTION PLAN & PAYSTACK */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          {/* Current Plan Overview Card */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 font-medium">Current Active Subscription:</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300 border border-slate-700">
                  {subscription?.interval ? `Billed ${subscription.interval}` : 'Monthly'}
                </span>
              </div>
              <h3 className="text-2xl font-black text-emerald-400 uppercase tracking-tight flex items-center space-x-2">
                <span>{subscription?.plan ? subscription.plan.toUpperCase() : business?.plan || 'FREE'} PLAN</span>
                {currentPlanNormalized !== 'free' && (
                  <span className="text-xs text-slate-400 font-mono font-normal">
                    (GH₵{subscription?.amount ? Number(subscription.amount).toFixed(2) : currentPlanNormalized === 'starter' ? '49.00' : '99.00'}/mo)
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Next Billing / Renewal Date:</span>
                <span className="text-slate-200 font-mono font-semibold">
                  {formatDate(subscription?.nextBillingDate || subscription?.expiresAt)}
                </span>
                {subscription?.paymentProvider && subscription.paymentProvider !== 'none' && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800/60 uppercase">
                    Provider: {subscription.paymentProvider === 'paystack' ? 'Paystack' : subscription.paymentProvider}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                subscription?.status === 'active' || !subscription?.status
                  ? 'bg-emerald-950/80 border-emerald-800/60 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-800/60 text-amber-300'
              }`}>
                {subscription?.status ? subscription.status.toUpperCase() : 'ACTIVE'}
              </span>
              <button
                onClick={loadSubscriptionData}
                disabled={subLoading}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                title="Refresh subscription details"
              >
                <RefreshCw className={`w-4 h-4 ${subLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Paystack Test Mode Banner */}
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-emerald-200">
                Secure Paystack Payments (Test Mode Active)
              </p>
              <p className="text-emerald-400/80 leading-relaxed text-[11px]">
                Subscriptions are processed securely in Ghana Cedis (GHS) through Paystack. Supports Mobile Money (MTN MoMo, Telecel Cash, AT Money) and Bank Cards.
              </p>
            </div>
          </div>

          {/* SubTab Inline Error Banner */}
          {subTabError && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-xs text-rose-200 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-100">Payment Initialization Issue</p>
                <p className="text-rose-300 leading-relaxed">{subTabError}</p>
              </div>
            </div>
          )}

          {/* Active Paystack Checkout Direct Action (if popup was blocked) */}
          {checkoutUrl && (
            <div className="p-4 rounded-2xl bg-emerald-900/40 border border-emerald-500 text-xs text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center space-x-2">
                <ExternalLink className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold text-white">Paystack Checkout Ready</p>
                  <p className="text-emerald-300 text-[11px]">Click the button below to open the secure payment checkout page.</p>
                </div>
              </div>
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition shadow"
              >
                <span>Proceed to Paystack Checkout</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Plan Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. FREE PLAN */}
            <div
              className={`p-6 rounded-3xl border flex flex-col justify-between transition ${
                currentPlanNormalized === 'free'
                  ? 'bg-slate-900 border-2 border-emerald-500 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">FREE</span>
                  {currentPlanNormalized === 'free' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      Current Plan
                    </span>
                  )}
                </div>
                <div className="mt-3 text-3xl font-black text-white font-mono">
                  GH₵0<span className="text-xs text-slate-500 font-sans font-normal"> / month</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Basic point of sale for small kiosks and single shops.
                </p>
                <ul className="mt-5 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Basic POS & Products
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> WhatsApp Receipts
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Single Business Location
                  </li>
                </ul>
              </div>

              <button
                disabled={currentPlanNormalized === 'free' || saving}
                onClick={handleSwitchToFree}
                className={`mt-6 w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  currentPlanNormalized === 'free'
                    ? 'bg-slate-800 text-slate-500 cursor-default'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                <span>{currentPlanNormalized === 'free' ? 'Active Plan' : 'Downgrade to Free'}</span>
              </button>
            </div>

            {/* 2. STARTER PLAN */}
            <div
              className={`p-6 rounded-3xl border flex flex-col justify-between transition relative overflow-hidden ${
                currentPlanNormalized === 'starter'
                  ? 'bg-slate-900 border-2 border-emerald-500 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-emerald-800/80'
              }`}
            >
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                Popular
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase">STARTER</span>
                  {currentPlanNormalized === 'starter' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      Current Plan
                    </span>
                  )}
                </div>
                <div className="mt-3 text-3xl font-black text-white font-mono">
                  GH₵49<span className="text-xs text-slate-500 font-sans font-normal"> / month</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Complete tools for growing shops and retail enterprises.
                </p>
                <ul className="mt-5 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Unlimited Inventory Catalog
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Debt Tracking & Customer Reminders
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Purchases & P&L Reports
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Low Stock Alerts
                  </li>
                </ul>
              </div>

              <button
                disabled={currentPlanNormalized === 'starter' || initiatingPlan === 'starter'}
                onClick={() => handlePaystackUpgrade('starter')}
                className={`mt-6 w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                  currentPlanNormalized === 'starter'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80 cursor-default'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950'
                }`}
              >
                {initiatingPlan === 'starter' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting Paystack...</span>
                  </>
                ) : currentPlanNormalized === 'starter' ? (
                  <span>Active Plan</span>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Upgrade to Starter (GH₵49)</span>
                  </>
                )}
              </button>
            </div>

            {/* 3. BUSINESS PLAN */}
            <div
              className={`p-6 rounded-3xl border flex flex-col justify-between transition relative ${
                currentPlanNormalized === 'business'
                  ? 'bg-slate-900 border-2 border-emerald-500 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-teal-800/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-400 uppercase">BUSINESS</span>
                  {currentPlanNormalized === 'business' && (
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-bold">
                      Current Plan
                    </span>
                  )}
                </div>
                <div className="mt-3 text-3xl font-black text-white font-mono">
                  GH₵99<span className="text-xs text-slate-500 font-sans font-normal"> / month</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Full suite with B2B invoicing, quotations, and priority support.
                </p>
                <ul className="mt-5 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Everything in Starter
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Invoicing & Professional Quotes
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Audit Logs & Security History
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Priority WhatsApp Support
                  </li>
                </ul>
              </div>

              <button
                disabled={currentPlanNormalized === 'business' || initiatingPlan === 'business'}
                onClick={() => handlePaystackUpgrade('business')}
                className={`mt-6 w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                  currentPlanNormalized === 'business'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80 cursor-default'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950'
                }`}
              >
                {initiatingPlan === 'business' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting Paystack...</span>
                  </>
                ) : currentPlanNormalized === 'business' ? (
                  <span>Active Plan</span>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Upgrade to Business (GH₵99)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Payment Transactions History Table */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Subscription Payment History</h3>
                <p className="text-xs text-slate-400">
                  Transaction receipts and verified payments for your business account
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {payments.length} {payments.length === 1 ? 'record' : 'records'}
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No payment transactions recorded for this business yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400">
                      <th className="pb-3">Reference</th>
                      <th className="pb-3">Plan</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Provider</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {payments.map((p) => {
                      const statusLower = (p.status || '').toString().toLowerCase();
                      const isSuccess =
                        statusLower === 'success' ||
                        statusLower === 'successful' ||
                        statusLower === 'paid' ||
                        statusLower === 'verified';
                      const isFailed = statusLower === 'failed' || statusLower === 'abandoned';
                      const isPending = statusLower === 'pending';

                      let badgeClass = 'bg-slate-800 text-slate-300 border border-slate-700';
                      let displayStatus = p.status || 'Pending';

                      if (isSuccess) {
                        badgeClass = 'bg-emerald-950/90 text-emerald-400 border border-emerald-800/60';
                        displayStatus = 'Successful';
                      } else if (isFailed) {
                        badgeClass = 'bg-rose-950/90 text-rose-300 border border-rose-800/60';
                        displayStatus = 'Failed';
                      } else if (isPending) {
                        badgeClass = 'bg-amber-950/90 text-amber-300 border border-amber-800/60';
                        displayStatus = 'Pending';
                      }

                      return (
                        <tr key={p.id || p.reference} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 font-mono font-bold text-emerald-400">
                            {p.reference}
                          </td>
                          <td className="py-3 uppercase font-semibold text-slate-200">
                            {p.plan}
                          </td>
                          <td className="py-3 font-mono font-bold text-white">
                            GH₵ {Number(p.amount).toFixed(2)}
                          </td>
                          <td className="py-3 uppercase text-slate-400 font-mono text-[10px]">
                            {p.provider || 'paystack'}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badgeClass}`}
                            >
                              {displayStatus}
                            </span>
                          </td>
                          <td className="py-3 text-slate-400 font-mono">
                            {formatDate(p.paymentDate || p.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Plan Entitlements & Resource Limits Card (Stage 4R) */}
          {subUsage && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Plan Entitlements & Resource Governance</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live quota utilization and plan limits for your active {subUsage.effectivePlan.toUpperCase()} tier
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                  {subUsage.effectivePlan}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Staff Accounts</span>
                    <span className="font-mono font-bold text-slate-200">
                      {subUsage.staffCount} / {subUsage.maxStaff === Infinity ? '∞' : subUsage.maxStaff}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${subUsage.limitsReached.staff ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{
                        width: `${Math.min(100, (subUsage.staffCount / (subUsage.maxStaff === Infinity ? 100 : subUsage.maxStaff)) * 100)}%`,
                      }}
                    />
                  </div>
                  {subUsage.limitsReached.staff && (
                    <p className="text-[10px] text-rose-400 font-semibold mt-1.5">Quota reached - upgrade to add more</p>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Branch Locations</span>
                    <span className="font-mono font-bold text-slate-200">
                      {subUsage.locationCount} / {subUsage.maxLocations === Infinity ? '∞' : subUsage.maxLocations}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${subUsage.limitsReached.locations ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{
                        width: `${Math.min(100, (subUsage.locationCount / (subUsage.maxLocations === Infinity ? 100 : subUsage.maxLocations)) * 100)}%`,
                      }}
                    />
                  </div>
                  {subUsage.limitsReached.locations && (
                    <p className="text-[10px] text-rose-400 font-semibold mt-1.5">Upgrade to Business for multi-branches</p>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Active Products</span>
                    <span className="font-mono font-bold text-slate-200">
                      {subUsage.productCount} / {subUsage.maxProducts === Infinity ? '∞' : subUsage.maxProducts}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (subUsage.productCount / (subUsage.maxProducts === Infinity ? 500 : subUsage.maxProducts)) * 100)}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Monthly Sales</span>
                    <span className="font-mono font-bold text-slate-200">
                      {subUsage.monthlyTransactionCount} / {subUsage.maxMonthlyTransactions === Infinity ? '∞' : subUsage.maxMonthlyTransactions}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (subUsage.monthlyTransactionCount / (subUsage.maxMonthlyTransactions === Infinity ? 1000 : subUsage.maxMonthlyTransactions)) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Official Billing Invoices Table (Stage 4R) */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Official SaaS Tax Invoices</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Sequential, server-authoritative billing receipts for tax compliance and accounting
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {billingInvoices.length} {billingInvoices.length === 1 ? 'invoice' : 'invoices'}
              </span>
            </div>

            {billingInvoices.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No formal billing invoices generated yet. Invoices are automatically issued on subscription fulfillment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400">
                      <th className="pb-3">Invoice Number</th>
                      <th className="pb-3">Plan</th>
                      <th className="pb-3">Period</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Paid Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {billingInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 font-mono font-bold text-emerald-400">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 uppercase font-semibold text-slate-200">
                          {inv.plan}
                        </td>
                        <td className="py-3 text-slate-400 text-[11px]">
                          {formatDate(inv.billingPeriodStart)} – {formatDate(inv.billingPeriodEnd)}
                        </td>
                        <td className="py-3 font-mono font-bold text-white">
                          GH₵ {Number(inv.amount).toFixed(2)}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-800/60'
                              : 'bg-amber-950/90 text-amber-300 border border-amber-800/60'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400 font-mono">
                          {formatDate(inv.paidAt || inv.createdAt)}
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

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <LockedFeatureGate
          feature="audit_logs"
          subscription={effectiveSubscription}
          business={business}
          isMasterAdmin={isMasterAdmin}
          onNavigateToUpgrade={() => setActiveTab('subscription')}
        >
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Security & Operation Audit Logs</h3>
                <p className="text-xs text-slate-400">
                  Detailed timeline of administrative and financial transactions
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {auditLogs.length} events recorded
              </span>
            </div>

            {auditLoading ? (
              <div className="py-12 text-center text-slate-500 animate-pulse">
                Loading audit logs...
              </div>
            ) : auditLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400">
                      <th className="pb-3">Timestamp</th>
                      <th className="pb-3">User / Actor</th>
                      <th className="pb-3">Action</th>
                      <th className="pb-3">Event Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 text-slate-400 font-mono whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>

                        <td className="py-3 font-semibold text-slate-200">{log.userName}</td>

                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-emerald-400 font-mono">
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3 text-slate-300">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                No audit logs recorded yet.
              </div>
            )}
          </div>
        </LockedFeatureGate>
      )}

      {/* TAB 5: STAFF & TEAM */}
      {activeTab === 'staff' && isBusinessOwner && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Staff & Cashier Management</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Manage cashier accounts, authorize staff to process sales, and control access for {business?.name || 'your business'}.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStaffIntelligenceId(undefined);
                    setShowStaffIntelligenceModal(true);
                  }}
                  className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Performance Intelligence</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStaffModalError('');
                    setStaffFullName('');
                    setStaffEmail('');
                    setStaffPhone('');
                    setStaffPassword('');
                    setStaffPermissions({ ...DEFAULT_STAFF_PERMISSIONS });
                    setShowAddStaffModal(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-950 shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Staff Member</span>
                </button>
              </div>
            </div>

            {/* Staff List Table */}
            {staffLoading ? (
              <div className="py-12 text-center text-slate-500 flex items-center justify-center gap-2 text-xs animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading staff members...</span>
              </div>
            ) : staffList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400">
                      <th className="pb-3">Staff Member</th>
                      <th className="pb-3">Contact</th>
                      <th className="pb-3">Role & Permissions</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Added On</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {staffList.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 font-semibold text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-black text-xs">
                              {member.fullName ? member.fullName.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div>
                              <span>{member.fullName}</span>
                              <div className="text-[10px] text-slate-500 font-mono">ID: {member.id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 text-slate-300">
                          <div className="flex flex-col">
                            <span className="text-slate-200">{member.email}</span>
                            {member.phone && <span className="text-[10px] text-slate-400">{member.phone}</span>}
                          </div>
                        </td>

                        <td className="py-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="px-2 py-0.5 rounded-md bg-sky-950/80 border border-sky-800/80 text-[10px] font-bold text-sky-300 font-mono">
                              Cashier / Staff
                            </span>
                            {(() => {
                              const perms = member.permissions
                                ? { ...DEFAULT_STAFF_PERMISSIONS, ...member.permissions }
                                : DEFAULT_STAFF_PERMISSIONS;
                              const count = Object.values(perms).filter(Boolean).length;
                              return (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {count} of 13 permissions
                                </span>
                              );
                            })()}
                          </div>
                        </td>

                        <td className="py-3">
                          {member.status === 'active' || !member.status ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-[10px] font-bold text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-800/80 text-[10px] font-bold text-rose-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="py-3 text-slate-400 font-mono text-[11px]">
                          {formatDate(member.createdAt)}
                        </td>

                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStaffIntelligenceId(member.id);
                                setShowStaffIntelligenceModal(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-indigo-500/30 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white transition flex items-center gap-1"
                              title="View performance intelligence for this staff member"
                            >
                              <Sparkles className="w-3 h-3 text-indigo-400" />
                              <span>Metrics</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditStaffModal(member)}
                              disabled={saving}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition flex items-center gap-1"
                              title="Edit staff details and permissions"
                            >
                              <Shield className="w-3 h-3 text-emerald-400" />
                              <span>Permissions</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStaffStatus(member)}
                              disabled={saving}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                                member.status === 'inactive'
                                  ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/50'
                                  : 'bg-amber-950/50 border-amber-700/60 text-amber-300 hover:bg-amber-900/50'
                              }`}
                            >
                              {member.status === 'inactive' ? (
                                <span className="flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" />
                                  Activate
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <UserX className="w-3 h-3" />
                                  Deactivate
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(member)}
                              disabled={saving}
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-400 hover:bg-rose-900/50 hover:text-rose-200 transition flex items-center gap-1"
                              title="Revoke access and delete account"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Revoke</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-500">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">No Staff Members Added Yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Add cashiers and team members so they can process POS sales and record transactions under this business.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStaffModalError('');
                    setStaffFullName('');
                    setStaffEmail('');
                    setStaffPhone('');
                    setStaffPassword('');
                    setStaffPermissions({ ...DEFAULT_STAFF_PERMISSIONS });
                    setShowAddStaffModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-950"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add First Staff Member</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Add Staff / Cashier Account</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {staffModalError && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{staffModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kofi Mensah"
                  value={staffFullName}
                  onChange={(e) => setStaffFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. kofi@kwameenterprise.gh"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
                <p className="text-[11px] text-slate-500">The staff member will use this email to log in.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. 0244123456"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
                <p className="text-[11px] text-slate-500">Provide this initial password securely to your staff member.</p>
              </div>

              {renderPermissionsSection(staffPermissions, setStaffPermissions)}

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  disabled={staffSubmitting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={staffSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-950"
                >
                  {staffSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{staffSubmitting ? 'Creating...' : 'Create Staff Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Edit Staff Permissions & Account</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {editStaffModalError && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editStaffModalError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStaff} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-1">
                <div className="text-[11px] text-slate-400">Account Email</div>
                <div className="text-white font-mono font-medium">{editingStaff.email}</div>
                <div className="text-[10px] text-slate-500">Email address cannot be changed once created.</div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kofi Mensah"
                  value={editStaffFullName}
                  onChange={(e) => setEditStaffFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. 0244123456"
                  value={editStaffPhone}
                  onChange={(e) => setEditStaffPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">Reset Password (Optional)</label>
                <input
                  type="password"
                  minLength={6}
                  placeholder="Leave blank to keep existing password"
                  value={editStaffPassword}
                  onChange={(e) => setEditStaffPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
                <p className="text-[11px] text-slate-500">Only enter a password if you wish to reset it for this staff member.</p>
              </div>

              {renderPermissionsSection(editStaffPermissions, setEditStaffPermissions)}

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  disabled={editStaffSubmitting}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editStaffSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-950"
                >
                  {editStaffSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editStaffSubmitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: GOVERNANCE & CONTROL */}
      {activeTab === 'governance' && (
        <LockedFeatureGate
          feature="governance"
          subscription={effectiveSubscription}
          business={business}
          isMasterAdmin={isMasterAdmin}
          onNavigateToUpgrade={() => setActiveTab('subscription')}
        >
          <BusinessGovernanceCenter />
        </LockedFeatureGate>
      )}

      {/* Staff Operations & Performance Intelligence Modal */}
      <StaffIntelligenceModal
        isOpen={showStaffIntelligenceModal}
        onClose={() => setShowStaffIntelligenceModal(false)}
        business={business}
        initialStaffId={selectedStaffIntelligenceId}
      />
    </div>
  );
};
