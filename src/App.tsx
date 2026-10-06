import React, { useState, useEffect } from 'react';
import {
  Store,
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  Users,
  Wallet,
  TrendingDown,
  Truck,
  PackagePlus,
  FileText,
  BarChart3,
  Bell,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Zap,
  Lock,
  MessageSquare,
  Award,
  MapPin,
  Link2,
  Compass,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { LandingPage } from './components/LandingPage.js';
import { AuthModal } from './components/AuthModal.js';
import { OnboardingModal } from './components/OnboardingModal.js';
import { DashboardView } from './components/DashboardView.js';
import { SalesView } from './components/SalesView.js';
import { ProductsView } from './components/ProductsView.js';
import { LocationsView } from './components/LocationsView.js';
import { IntegrationsView } from './components/IntegrationsView.js';
import { CustomersView } from './components/CustomersView.js';
import { LoyaltyRetentionCenter } from './components/LoyaltyRetentionCenter.js';
import { DebtorsView } from './components/DebtorsView.js';
import { CustomerCommunicationsCenter } from './components/CustomerCommunicationsCenter.js';
import { ExpensesView } from './components/ExpensesView.js';
import { SuppliersView } from './components/SuppliersView.js';
import { PurchasesView } from './components/PurchasesView.js';
import { InvoicesView } from './components/InvoicesView.js';
import { ReportsView } from './components/ReportsView.js';
import { BusinessPlanningCenter } from './components/BusinessPlanningCenter.js';
import { NotificationsView } from './components/NotificationsView.js';
import { SettingsView } from './components/SettingsView.js';
import { AdminView } from './components/AdminView.js';
import { BusinessGovernanceCenter } from './components/BusinessGovernanceCenter.js';
import { ReceiptModal } from './components/ReceiptModal.js';
import { InvoiceModal } from './components/InvoiceModal.js';
import { LockedFeatureGate } from './components/LockedFeatureGate.js';
import {
  canAccessFeature,
  getEffectivePlan,
  FEATURE_REQUIRED_PLAN,
  PLAN_DISPLAY_NAMES,
  type FeatureKey,
} from './utils/featureAccess.js';
import { api } from './services/api.js';
import type { Sale, Invoice, BusinessSettings } from './types/index.js';

const checkIsAdminRoute = () => {
  if (typeof window === 'undefined') return false;
  const path = (window.location.pathname || '').toLowerCase();
  const hash = (window.location.hash || '').toLowerCase();
  const search = (window.location.search || '').toLowerCase();

  return (
    path === '/admin' ||
    path === '/admin/' ||
    path.startsWith('/admin/') ||
    hash === '#/admin' ||
    hash === '#/admin/' ||
    hash.startsWith('#/admin') ||
    hash === '#admin' ||
    search.includes('view=admin')
  );
};

// Dedicated Master Admin Login Portal for /admin visits
const AdminLoginPage: React.FC<{ onReturnHome: () => void }> = ({ onReturnHome }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@businessmanagergh.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid administrator credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between antialiased selection:bg-emerald-500 selection:text-slate-950 font-sans">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Business Manager <span className="text-emerald-400">GH</span></span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[10px] font-bold text-emerald-400 tracking-wider uppercase">
                Admin
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Platform Administration Portal</p>
          </div>
        </div>
        <button
          onClick={onReturnHome}
          className="text-xs font-semibold text-slate-400 hover:text-emerald-400 transition"
        >
          &larr; Return to Public Website
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Master Admin Access</h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Authenticate with your Platform Owner credentials to access global management controls.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-start space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@businessmanagergh.com"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm transition shadow-lg shadow-emerald-950 disabled:opacity-50"
            >
              {loading ? 'Authenticating Admin...' : 'Sign In to Master Admin'}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onReturnHome}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              Not an administrator? Go to Business Sign-In
            </button>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-slate-400 text-xs border-t border-slate-900">
        &copy; {new Date().getFullYear()} Business Manager GH Platform Administration. Restricted Access.
      </footer>
    </div>
  );
};

function MainApp() {
  const { user, business, subscription, isAuthenticated, isLoading, logout, refreshAuth } = useAuth();

  const isMasterAdmin =
    Boolean(user) &&
    (user?.role === 'admin' ||
      user?.role === 'master_admin' ||
      user?.id === 'usr_admin_master' ||
      user?.email?.toLowerCase() === 'admin@businessmanagergh.com');

  // Navigation State - initialized with current URL route
  const [currentView, setCurrentView] = useState<string>(() => {
    return checkIsAdminRoute() ? 'admin' : 'dashboard';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    'business' | 'account' | 'subscription' | 'audit' | 'staff' | 'governance' | 'whatsapp'
  >('business');

  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);

  useEffect(() => {
    if (isAuthenticated && business) {
      api.getSettings().then((res) => {
        if (res?.settings) setBusinessSettings(res.settings);
      }).catch(() => {});
    }
  }, [isAuthenticated, business?.id]);

  const navigateToUpgrade = () => {
    setSettingsInitialTab('subscription');
    setCurrentView('settings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Paystack Redirect Payment Verification State
  const [paymentBanner, setPaymentBanner] = useState<{
    type: 'success' | 'error' | 'loading';
    message: string;
    reference?: string;
  } | null>(null);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Active Receipt & Invoice for Modals
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceCreateMode, setInvoiceCreateMode] = useState(false);
  const [invoiceRefreshKey, setInvoiceRefreshKey] = useState(0);
  const [selectedCustomerForPOS, setSelectedCustomerForPOS] = useState<string | undefined>(undefined);

  // Unread notifications count
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchUnreadCount = async () => {
    if (!isAuthenticated) return;
    try {
      const list = await api.getNotifications();
      setUnreadNotifications(list.filter((n) => !n.read).length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Handle Paystack Return Callback
  useEffect(() => {
    if (!isAuthenticated) return;

    const urlParams = new URLSearchParams(window.location.search);
    const paymentRef =
      urlParams.get('payment_ref') ||
      urlParams.get('reference') ||
      urlParams.get('trxref');

    if (paymentRef) {
      setPaymentBanner({
        type: 'loading',
        message: 'Verifying Paystack subscription payment...',
        reference: paymentRef,
      });

      api
        .verifySubscriptionPayment(paymentRef)
        .then(async (res) => {
          setPaymentBanner({
            type: 'success',
            message:
              res.message ||
              `Subscription payment verified! Your account is now on the ${res.subscription?.plan?.toUpperCase() || ''} Plan.`,
            reference: paymentRef,
          });
          await refreshAuth();
          // Clean search params from URL without page reload
          const cleanUrl =
            window.location.pathname + (window.location.hash || '');
          window.history.replaceState({}, document.title, cleanUrl);
        })
        .catch((err) => {
          setPaymentBanner({
            type: 'error',
            message:
              err.message ||
              'Unable to verify Paystack payment. Please check your reference or contact support.',
            reference: paymentRef,
          });
        });
    }
  }, [isAuthenticated]);

  // Check if onboarding is needed on first login for merchant businesses
  useEffect(() => {
    if (isAuthenticated && business && !business.phone && !isMasterAdmin) {
      setOnboardingOpen(true);
    }
  }, [isAuthenticated, business, isMasterAdmin]);

  // If unauthenticated user visits /admin or /#/admin, auto-open Login modal for admin login
  useEffect(() => {
    if (!isLoading && !isAuthenticated && checkIsAdminRoute()) {
      setAuthMode('login');
      setAuthModalOpen(true);
    }
  }, [isLoading, isAuthenticated]);

  // Set default view on login / route check
  useEffect(() => {
    if (isAuthenticated) {
      if (checkIsAdminRoute()) {
        setCurrentView('admin');
      } else if (isMasterAdmin && !business && currentView === 'dashboard') {
        setCurrentView('admin');
      }
    }
  }, [isAuthenticated, isMasterAdmin, business]);

  // Sync /admin URL path on popstate and hashchange
  useEffect(() => {
    const syncViewWithUrl = () => {
      if (checkIsAdminRoute()) {
        setCurrentView('admin');
      } else {
        if (currentView === 'admin' && !isMasterAdmin) {
          setCurrentView('dashboard');
        }
      }
    };

    window.addEventListener('popstate', syncViewWithUrl);
    window.addEventListener('hashchange', syncViewWithUrl);
    return () => {
      window.removeEventListener('popstate', syncViewWithUrl);
      window.removeEventListener('hashchange', syncViewWithUrl);
    };
  }, [currentView, isMasterAdmin]);

  const handleNavigate = (viewId: string) => {
    setCurrentView(viewId);
    if (viewId === 'admin') {
      if (window.location.hash.startsWith('#/')) {
        window.location.hash = '#/admin';
      } else {
        window.history.pushState(null, '', '/admin');
      }
    } else {
      if (window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')) {
        window.history.pushState(null, '', '/');
      }
      if (window.location.hash === '#/admin' || window.location.hash === '#admin') {
        window.location.hash = '';
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-600 animate-spin flex items-center justify-center">
          <Store className="w-5 h-5 text-white" />
        </div>
        <p className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
          Loading Business Manager GH...
        </p>
      </div>
    );
  }

  // If not logged in and visiting admin route, show dedicated Master Admin Login Portal
  if (!isAuthenticated && (currentView === 'admin' || checkIsAdminRoute())) {
    return (
      <AdminLoginPage
        onReturnHome={() => {
          if (window.location.hash.startsWith('#/')) {
            window.location.hash = '';
          } else {
            window.history.pushState(null, '', '/');
          }
          setCurrentView('dashboard');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
      />
    );
  }

  // If not logged in, show Landing Page with Auth Modal
  if (!isAuthenticated) {
    return (
      <>
        <LandingPage
          onGetStarted={() => {
            setAuthMode('register');
            setAuthModalOpen(true);
          }}
          onLogin={() => {
            setAuthMode('login');
            setAuthModalOpen(true);
          }}
        />

        <AuthModal
          isOpen={authModalOpen}
          initialMode={authMode}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => {
            setAuthModalOpen(false);
            if (checkIsAdminRoute()) {
              setCurrentView('admin');
            }
          }}
        />
      </>
    );
  }

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    badge?: number;
    featureKey?: FeatureKey;
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales / POS', icon: ShoppingBag },
    { id: 'products', label: 'Products & Stock', icon: Boxes },
    { id: 'customers', label: 'Customers', icon: Users, featureKey: 'customers' },
    { id: 'loyalty', label: 'Loyalty & Retention', icon: Award, featureKey: 'loyalty' },
    { id: 'communications', label: 'Communications', icon: MessageSquare, featureKey: 'customers' },
    { id: 'debtors', label: 'Debtors', icon: Wallet, featureKey: 'debtors' },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown },
    { id: 'suppliers', label: 'Suppliers', icon: Truck, featureKey: 'suppliers' },
    { id: 'purchases', label: 'Purchases (Stock-In)', icon: PackagePlus, featureKey: 'purchases' },
    { id: 'invoices', label: 'Invoices', icon: FileText, featureKey: 'invoices' },
    { id: 'reports', label: 'Financial Reports', icon: BarChart3, featureKey: 'financial_reports' },
    { id: 'planning', label: 'Business Planning', icon: Compass, featureKey: 'financial_reports' },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotifications > 0 ? unreadNotifications : undefined,
    },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'governance', label: 'Governance & Control', icon: ShieldCheck, featureKey: 'governance' },
    { id: 'locations', label: 'Branches & Locations', icon: MapPin, featureKey: 'locations' },
    { id: 'integrations', label: 'Ecosystem & Integrations', icon: Link2, featureKey: 'integrations' },
  ];

  if (isMasterAdmin) {
    navItems.push({ id: 'admin', label: 'Master Admin', icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-slate-950 shrink-0 sticky top-0 h-screen overflow-y-auto">
        {/* Brand */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight leading-tight">
                Business Manager <span className="text-emerald-400">GH</span>
              </h2>
              <span className="text-[10px] text-slate-400 truncate block max-w-[130px]">
                {isMasterAdmin ? 'Platform Admin' : (business?.name || 'My Shop')}
              </span>
            </div>
          </div>
        </div>

        {/* Business / Admin Status Card */}
        {isMasterAdmin ? (
          <div className="p-3.5 mx-3 mt-3 rounded-2xl bg-slate-900/80 border border-emerald-800/50 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Platform Owner</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-950/90 text-emerald-400 text-[10px] font-bold border border-emerald-800/60">
                Master Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-semibold mt-1 truncate">
              Business Manager GH
            </p>
          </div>
        ) : (
          <div className="p-3.5 mx-3 mt-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Active Tier</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-950/90 text-emerald-400 text-[10px] font-bold border border-emerald-800/60">
                {PLAN_DISPLAY_NAMES[getEffectivePlan(subscription, business)]} Plan
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] text-slate-300 font-semibold truncate">
                {business?.location || 'Ghana'}
              </p>
              {getEffectivePlan(subscription, business) !== 'business' && (
                <button
                  onClick={navigateToUpgrade}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 underline"
                >
                  Upgrade
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const isLocked = item.featureKey
              ? !canAccessFeature(subscription, item.featureKey, isMasterAdmin, business)
              : false;
            const requiredPlan = item.featureKey ? FEATURE_REQUIRED_PLAN[item.featureKey] : null;
            const requiredPlanName = requiredPlan ? PLAN_DISPLAY_NAMES[requiredPlan] : '';

            return (
              <button
                key={item.id}
                onClick={() => {
                  handleNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
                  isActive
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
                    : isLocked
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isLocked ? 'text-slate-400' : ''}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  {isLocked && requiredPlanName && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 border border-amber-500/40 text-amber-400 shadow-sm">
                      <Lock className="w-2.5 h-2.5" />
                      <span>{requiredPlanName}</span>
                    </span>
                  )}
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* User profile & Logout */}
        <div className="p-3 border-t border-slate-800/80">
          <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/60 flex items-center justify-between">
            <div className="truncate mr-2">
              <p className="text-xs font-bold text-white truncate">{user?.fullName}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md px-4 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-900 border border-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Store className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-white">BM GH</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentView('notifications')}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 relative"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          <button
            onClick={() => setCurrentView('sales')}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
          >
            POS
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                <Store className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-white">{business?.name || 'Menu'}</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 py-4 space-y-1.5 overflow-y-auto text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const isLocked = item.featureKey
                ? !canAccessFeature(subscription, item.featureKey, isMasterAdmin, business)
                : false;
              const requiredPlan = item.featureKey ? FEATURE_REQUIRED_PLAN[item.featureKey] : null;
              const requiredPlanName = requiredPlan ? PLAN_DISPLAY_NAMES[requiredPlan] : '';

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition ${
                    isActive
                      ? 'bg-emerald-600 text-white font-bold'
                      : isLocked
                      ? 'text-slate-400 hover:bg-slate-900/60'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-5 h-5 ${isLocked ? 'text-slate-400' : ''}`} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isLocked && requiredPlanName && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 border border-amber-500/40 text-amber-400">
                        <Lock className="w-2.5 h-2.5" />
                        <span>{requiredPlanName}</span>
                      </span>
                    )}
                    {item.badge !== undefined && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={logout}
              className="w-full py-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 font-bold text-xs flex items-center justify-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out ({user?.fullName})</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Content View Router */}
      <main className="flex-1 overflow-y-auto min-h-screen pb-20 md:pb-8">
        {paymentBanner && (
          <div className="p-4 max-w-5xl mx-auto">
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg text-xs animate-fadeIn ${
                paymentBanner.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
                  : paymentBanner.type === 'error'
                  ? 'bg-rose-950/90 border-rose-700 text-rose-200'
                  : 'bg-slate-900/90 border-slate-700 text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                {paymentBanner.type === 'success' && (
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                {paymentBanner.type === 'error' && (
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                {paymentBanner.type === 'loading' && (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin shrink-0" />
                )}
                <div>
                  <p className="font-bold">{paymentBanner.message}</p>
                  {paymentBanner.reference && (
                    <p className="text-[10px] opacity-75 font-mono">
                      Ref: {paymentBanner.reference}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPaymentBanner(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {currentView === 'dashboard' && (
          <DashboardView
            business={business}
            onNavigate={(v) => setCurrentView(v)}
            onOpenNewSale={() => setCurrentView('sales')}
            onOpenReceipt={(sale) => setActiveReceiptSale(sale)}
          />
        )}

        {currentView === 'sales' && (
          <SalesView
            business={business}
            initialCustomerId={selectedCustomerForPOS}
            onClearInitialCustomer={() => setSelectedCustomerForPOS(undefined)}
            onOpenReceipt={(sale) => setActiveReceiptSale(sale)}
          />
        )}

        {currentView === 'products' && <ProductsView business={business} />}

        {currentView === 'customers' && (
          <LockedFeatureGate
            feature="customers"
            subscription={subscription}
            business={business}
            isMasterAdmin={isMasterAdmin}
            onNavigateToUpgrade={navigateToUpgrade}
          >
            <CustomersView
              business={business}
              subscription={subscription}
              isMasterAdmin={isMasterAdmin}
              onNavigateToUpgrade={navigateToUpgrade}
              onNavigateToPOS={(customerId) => {
                if (customerId) setSelectedCustomerForPOS(customerId);
                setCurrentView('sales');
              }}
              onOpenReceipt={(sale) => setActiveReceiptSale(sale)}
            />
          </LockedFeatureGate>
        )}

        {currentView === 'loyalty' && (
          <LockedFeatureGate
            feature="loyalty"
            subscription={subscription}
            business={business}
            isMasterAdmin={isMasterAdmin}
            onNavigateToUpgrade={navigateToUpgrade}
          >
            <LoyaltyRetentionCenter
              business={business}
              onNavigateToCustomer={(customerId) => {
                setCurrentView('customers');
              }}
            />
          </LockedFeatureGate>
        )}

        {currentView === 'debtors' && (
          <LockedFeatureGate
            feature="debtors"
            subscription={subscription}
            business={business}
            isMasterAdmin={isMasterAdmin}
            onNavigateToUpgrade={navigateToUpgrade}
          >
            <DebtorsView
              business={business}
              onOpenReceipt={(sale) => setActiveReceiptSale(sale)}
            />
          </LockedFeatureGate>
        )}

        {currentView === 'communications' && (
          <LockedFeatureGate
            feature="customers"
            subscription={subscription}
            business={business}
            isMasterAdmin={isMasterAdmin}
            onNavigateToUpgrade={navigateToUpgrade}
          >
            <CustomerCommunicationsCenter
              business={business}
              onNavigateToCustomer={() => {
                setCurrentView('customers');
              }}
            />
          </LockedFeatureGate>
        )}

        {currentView === 'expenses' && <ExpensesView business={business} />}

        {currentView === 'suppliers' && (
          <LockedFeatureGate
            feature="suppliers"
            subscription={subscription}
            business={business}
            isMasterAdmin={isMasterAdmin}
            onNavigateToUpgrade={navigateToUpgrade}
          >
            <SuppliersView
              business={business}
              onNavigateToPurchases={() => setCurrentView('purchases')}
            />
          </LockedFeatureGate>
        )}

        {currentView === 'purchases' && (
          <LockedFeatureGate
            feature="purchases"
            subscription={subscription}
            business={business}
            isMasterAdmin={isMasterAdmin}
            onNavigateToUpgrade={navigateToUpgrade}
          >
            <PurchasesView business={business} onRefreshProducts={() => {}} />
          </LockedFeatureGate>
        )}

        {currentView === 'invoices' && (
          <LockedFeatureGate
            feature="invoices"
            subscription={subscription}
            business={business}
            isMasterAdmin={isMasterAdmin}
            onNavigateToUpgrade={navigateToUpgrade}
          >
            <InvoicesView
              business={business}
              refreshTrigger={invoiceRefreshKey}
              onOpenInvoiceModal={(inv) => {
                setActiveInvoice(inv);
                setInvoiceCreateMode(false);
                setInvoiceModalOpen(true);
              }}
              onOpenCreateInvoice={() => {
                setActiveInvoice(null);
                setInvoiceCreateMode(true);
                setInvoiceModalOpen(true);
              }}
            />
          </LockedFeatureGate>
        )}

        {currentView === 'reports' && (
          <LockedFeatureGate
            feature="financial_reports"
            subscription={subscription}
            business={business}
            isMasterAdmin={isMasterAdmin}
            onNavigateToUpgrade={navigateToUpgrade}
          >
            <ReportsView business={business} />
          </LockedFeatureGate>
        )}

        {currentView === 'planning' && (
          <LockedFeatureGate
            feature="financial_reports"
            subscription={subscription}
            business={business}
            isMasterAdmin={isMasterAdmin}
            onNavigateToUpgrade={navigateToUpgrade}
          >
            <BusinessPlanningCenter
              business={business}
              onNavigate={(v) => setCurrentView(v)}
            />
          </LockedFeatureGate>
        )}

        {currentView === 'notifications' && (
          <NotificationsView onRefreshBadge={fetchUnreadCount} />
        )}

        {currentView === 'settings' && (
          <SettingsView
            business={business}
            user={user}
            initialTab={settingsInitialTab}
            onSettingsUpdated={(updated) => setBusinessSettings(updated)}
          />
        )}

        {currentView === 'governance' && (
          <LockedFeatureGate
            feature="governance"
            subscription={subscription}
            business={business}
            isMasterAdmin={isMasterAdmin}
            onNavigateToUpgrade={navigateToUpgrade}
          >
            <BusinessGovernanceCenter />
          </LockedFeatureGate>
        )}

        {currentView === 'locations' && (
          <LockedFeatureGate
            feature="locations"
            subscription={subscription}
            business={business}
            isMasterAdmin={isMasterAdmin}
            onNavigateToUpgrade={navigateToUpgrade}
          >
            <LocationsView business={business} />
          </LockedFeatureGate>
        )}

        {currentView === 'integrations' && (
          <LockedFeatureGate
            feature="integrations"
            subscription={subscription}
            business={business}
            isMasterAdmin={isMasterAdmin}
            onNavigateToUpgrade={navigateToUpgrade}
          >
            <IntegrationsView
              currentUser={user}
              subscription={subscription}
              onUpgradeClick={navigateToUpgrade}
            />
          </LockedFeatureGate>
        )}

        {currentView === 'admin' && (
          <AdminView
            currentUser={user}
            onReturnToDashboard={() => handleNavigate('dashboard')}
          />
        )}
      </main>

      {/* Onboarding Modal */}
      {onboardingOpen && (
        <OnboardingModal
          isOpen={onboardingOpen}
          onComplete={() => setOnboardingOpen(false)}
        />
      )}

      {/* Receipt Modal */}
      {activeReceiptSale && (
        <ReceiptModal
          sale={activeReceiptSale}
          business={business}
          enableWhatsappReceipts={businessSettings?.enableWhatsappReceipts ?? true}
          onClose={() => setActiveReceiptSale(null)}
        />
      )}

      {/* Invoice Modal */}
      {invoiceModalOpen && (
        <InvoiceModal
          isOpen={invoiceModalOpen}
          invoice={activeInvoice}
          isCreateMode={invoiceCreateMode}
          business={business}
          onClose={() => {
            setInvoiceModalOpen(false);
            setActiveInvoice(null);
          }}
          onCreated={() => {
            setInvoiceModalOpen(false);
            setActiveInvoice(null);
            setInvoiceRefreshKey((prev) => prev + 1);
            setCurrentView('invoices');
          }}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
