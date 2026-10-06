import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt as ReceiptIcon,
  CreditCard,
  Phone,
  User as UserIcon,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Tag,
  Store,
  MessageSquare,
  Sparkles,
  X,
  ArrowLeft,
  ShoppingCart,
  Banknote,
  ShieldAlert,
  Clock,
  Layers,
  Check,
  Eye,
  Calendar,
  Filter,
  RotateCcw,
  TrendingUp,
  Printer,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { api } from '../services/api.js';
import {
  formatAccraDateTime,
  formatAccraDate,
  isTodayInAccra,
  isYesterdayInAccra,
  isPast7DaysInAccra,
  isThisMonthInAccra,
  getAccraDateString,
  getAccraToday,
} from '../utils/date.js';
import { useAuth } from '../context/AuthContext.js';
import { canAccessFeature } from '../utils/featureAccess.js';
import type { Product, Customer, Sale, PaymentMethod, Business } from '../types/index.js';

interface SalesViewProps {
  business: Business | null;
  initialCustomerId?: string;
  onClearInitialCustomer?: () => void;
  onOpenReceipt: (sale: Sale) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  business,
  initialCustomerId,
  onClearInitialCustomer,
  onOpenReceipt,
}) => {
  const { subscription, user } = useAuth();
  const isMasterAdmin =
    Boolean(user) &&
    (user?.role === 'admin' ||
      user?.role === 'master_admin' ||
      user?.id === 'usr_admin_master' ||
      user?.email?.toLowerCase() === 'admin@businessmanagergh.com');

  // Staff permission check for pos_sales
  const isStaff = user?.role === 'staff';
  const hasPosPermission = !isStaff || user?.permissions?.pos_sales !== false;

  const canAccessCustomers = canAccessFeature(subscription, 'customers', isMasterAdmin, business);

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');

  // Mobile POS view state: 'products' or 'checkout'
  const [mobileView, setMobileView] = useState<'products' | 'checkout'>('products');

  // POS State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock'>('all');
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId || '');
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [discount, setDiscount] = useState<string>('0');
  const [amountPaid, setAmountPaid] = useState<string>(''); // string to handle custom inputs
  const [dueDate, setDueDate] = useState<string>('');
  const [saleNotes, setSaleNotes] = useState('');

  // Quick Customer Inline Add
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCreditLimit, setNewCustCreditLimit] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Sales Ledger Search & Filter States
  const [historySearch, setHistorySearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('All');
  const [customerFilter, setCustomerFilter] = useState<string>('All');
  const [staffFilter, setStaffFilter] = useState<string>('All');
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<Sale | null>(null);

  // Financial and profit visibility
  const canViewProfit =
    !isStaff ||
    isMasterAdmin ||
    user?.role === 'business_owner' ||
    user?.permissions?.financial_reports === true;

  const currency = business?.currency || 'GH₵';

  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
      setWalkinName('');
      // If customer came from Debtors or Customers view, switch to checkout if cart has items
      if (cart.length > 0) {
        setMobileView('checkout');
      }
    }
  }, [initialCustomerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [prods, custs, sales] = await Promise.all([
        api.getProducts(),
        api.getPosCustomers().catch(() => []),
        api.getSales().catch((err: any) => {
          if (err?.message?.includes('Permission denied') || err?.code === 'STAFF_PERMISSION_DENIED') {
            return [];
          }
          throw err;
        }),
      ]);
      setProducts(Array.isArray(prods) ? prods : []);
      setCustomers(Array.isArray(custs) ? custs : []);
      setSalesHistory(Array.isArray(sales) ? sales : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load sales data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPosPermission) {
      loadData();
    }
  }, [canAccessCustomers, hasPosPermission]);

  // Selected customer record
  const currentCustomer = customers.find((c) => c.id === selectedCustomerId);
  const customerCreditLimit = currentCustomer?.creditLimit || 0;
  const customerCurrentDebt = currentCustomer?.currentDebt || 0;
  const availableCredit =
    customerCreditLimit > 0
      ? Math.max(0, customerCreditLimit - customerCurrentDebt)
      : Infinity;

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      setError(`"${product.name}" is OUT OF STOCK.`);
      setTimeout(() => setError(''), 3500);
      return;
    }

    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= product.quantity) {
        setError(`Cannot add more than ${product.quantity} units of "${product.name}" (only ${product.quantity} in stock).`);
        setTimeout(() => setError(''), 3500);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateCartQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    const prod = products.find((p) => p.id === productId);
    if (prod && newQty > prod.quantity) {
      setError(`Maximum available stock for "${prod.name}" is ${prod.quantity} units.`);
      setTimeout(() => setError(''), 3500);
      // Cap at available stock
      setCart(
        cart.map((item) =>
          item.product.id === productId ? { ...item, quantity: prod.quantity } : item
        )
      );
      return;
    }
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, quantity: Math.floor(newQty) } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    const updated = cart.filter((item) => item.product.id !== productId);
    setCart(updated);
    if (updated.length === 0 && mobileView === 'checkout') {
      setMobileView('products');
    }
  };

  const clearCart = () => {
    setCart([]);
    setDiscount('0');
    setAmountPaid('');
    setDueDate('');
    setSaleNotes('');
    setError('');
    if (mobileView === 'checkout') {
      setMobileView('products');
    }
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  const numericDiscount = discount === '' ? 0 : Number(discount);
  const validDiscount = isNaN(numericDiscount) || numericDiscount < 0 ? 0 : numericDiscount;
  const total = Math.max(0, subtotal - validDiscount);

  // Total items in cart
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Determine amount paid
  const numericAmountPaid =
    amountPaid === '' ? (paymentMethod === 'Credit/Debt' ? 0 : total) : Number(amountPaid) || 0;
  const balance = Math.max(0, total - numericAmountPaid);
  const changeDue = numericAmountPaid > total ? numericAmountPaid - total : 0;

  // Filter products for POS
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map((p) => p.category || 'General')))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'All' || (p.category || 'General') === selectedCategory;

      let matchesStock = true;
      if (stockFilter === 'in_stock') {
        matchesStock = p.quantity > 0;
      } else if (stockFilter === 'low_stock') {
        matchesStock = p.quantity > 0 && p.quantity <= p.minStockLevel;
      }

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  // Quick category counts
  const inStockCount = useMemo(() => products.filter((p) => p.quantity > 0).length, [products]);
  const lowStockCount = useMemo(
    () => products.filter((p) => p.quantity > 0 && p.quantity <= p.minStockLevel).length,
    [products]
  );

  // Handle Quick Add Customer
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      setError('Customer name and phone number are required.');
      return;
    }

    const parsedLimit = newCustCreditLimit.trim() ? Number(newCustCreditLimit) : 0;
    if (isNaN(parsedLimit) || parsedLimit < 0) {
      setError('Credit limit must be a positive number.');
      return;
    }

    try {
      const added = await api.addCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        creditLimit: parsedLimit,
      });
      setCustomers([...customers, added]);
      setSelectedCustomerId(added.id);
      setWalkinName('');
      setShowAddCustomer(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustCreditLimit('');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to add customer.');
    }
  };

  // Handle Quick Cash Tender Selection
  const handleQuickCash = (amount: number | 'exact') => {
    if (amount === 'exact') {
      setAmountPaid(total.toFixed(2));
    } else {
      setAmountPaid(amount.toFixed(2));
    }
  };

  // Handle Complete Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setError('Please add at least one product to the cart before checking out.');
      return;
    }

    // Validate quantities against latest known product stock
    for (const item of cart) {
      if (item.quantity <= 0) {
        setError(`Invalid quantity for "${item.product.name}". Must be at least 1.`);
        return;
      }
      if (item.quantity > item.product.quantity) {
        setError(`Cannot sell ${item.quantity} units of "${item.product.name}". Only ${item.product.quantity} units available in stock.`);
        return;
      }
    }

    // Validate discount
    const rawDisc = discount === '' ? 0 : Number(discount);
    if (isNaN(rawDisc) || rawDisc < 0) {
      setError('Discount cannot be negative.');
      return;
    }
    if (rawDisc > subtotal) {
      setError(`Discount cannot exceed subtotal of ${currency} ${subtotal.toFixed(2)}.`);
      return;
    }

    // Validate credit sale requirement: registered customer required
    if (paymentMethod === 'Credit/Debt' || balance > 0) {
      if (!selectedCustomerId) {
        setError('A registered customer is required for credit/debt sales. Please select or add a customer.');
        return;
      }

      if (customerCreditLimit > 0 && balance > availableCredit) {
        setError(
          `Credit limit exceeded. Customer credit limit is ${currency} ${customerCreditLimit.toFixed(
            2
          )}, current debt is ${currency} ${customerCurrentDebt.toFixed(
            2
          )}, available credit is ${currency} ${availableCredit.toFixed(2)}.`
        );
        return;
      }
    }

    let customerName = walkinName.trim() || 'Walk-in Customer';
    let customerPhone = walkinPhone.trim() || '';

    if (selectedCustomerId && currentCustomer) {
      customerName = currentCustomer.name;
      customerPhone = currentCustomer.phone;
    }

    try {
      setSubmitting(true);
      setError('');

      const salePayload: Partial<Sale> = {
        customerId: selectedCustomerId || undefined,
        customerName,
        customerPhone,
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          buyingPrice: item.product.buyingPrice,
          sellingPrice: item.product.sellingPrice,
          quantity: item.quantity,
          total: item.product.sellingPrice * item.quantity,
          profit: (item.product.sellingPrice - item.product.buyingPrice) * item.quantity,
        })),
        subtotal,
        discount: Number(discount) || 0,
        total,
        amountPaid: numericAmountPaid,
        dueDate: (paymentMethod === 'Credit/Debt' || balance > 0) && dueDate ? dueDate : undefined,
        paymentMethod,
        notes: saleNotes ? saleNotes.trim() : undefined,
      };

      const createdSale = await api.createSale(salePayload);

      // Refresh product stock and sales ledger
      await loadData();
      clearCart();
      if (onClearInitialCustomer) onClearInitialCustomer();

      // Show receipt modal immediately
      onOpenReceipt(createdSale);

      setSuccessToast(`Sale recorded successfully! Receipt #${createdSale.receiptNumber}`);
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to complete sale. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Unique Cashiers / Staff list
  const staffList = useMemo(() => {
    const list = new Set<string>();
    salesHistory.forEach((s) => {
      if (s.createdBy && s.createdBy.trim()) list.add(s.createdBy.trim());
    });
    return Array.from(list);
  }, [salesHistory]);

  // Today's Sales Summary (Strict Africa/Accra Business Day)
  const todaySales = useMemo(() => {
    return salesHistory.filter((s) => isTodayInAccra(s.createdAt));
  }, [salesHistory]);

  const todayTotalValue = useMemo(() => {
    return todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
  }, [todaySales]);

  const todayTransactionCount = todaySales.length;

  const todayCashTotal = useMemo(() => {
    return todaySales
      .filter((s) => s.paymentMethod === 'Cash')
      .reduce((sum, s) => sum + (s.total || 0), 0);
  }, [todaySales]);

  const todayMomoTotal = useMemo(() => {
    return todaySales
      .filter((s) => s.paymentMethod === 'Mobile Money')
      .reduce((sum, s) => sum + (s.total || 0), 0);
  }, [todaySales]);

  const todayCreditTotal = useMemo(() => {
    return todaySales
      .filter((s) => s.paymentMethod === 'Credit/Debt' || (s.balance && s.balance > 0))
      .reduce((sum, s) => sum + (s.balance > 0 ? s.balance : s.total || 0), 0);
  }, [todaySales]);

  const todayProfit = useMemo(() => {
    if (!canViewProfit) return 0;
    return todaySales.reduce((sum, s) => sum + (s.profit || 0), 0);
  }, [todaySales, canViewProfit]);

  // Check if any history filters are active
  const hasActiveHistoryFilters = Boolean(
    historySearch.trim() ||
      dateFilter !== 'all' ||
      paymentMethodFilter !== 'All' ||
      customerFilter !== 'All' ||
      staffFilter !== 'All' ||
      customStartDate ||
      customEndDate
  );

  const handleResetHistoryFilters = () => {
    setHistorySearch('');
    setDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setPaymentMethodFilter('All');
    setCustomerFilter('All');
    setStaffFilter('All');
  };

  // Comprehensive filter sales history
  const filteredSalesHistory = useMemo(() => {
    return salesHistory.filter((sale) => {
      // 1. Text Search (receipt number, customer name, phone, item name, staff/cashier)
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const matchesReceipt = sale.receiptNumber?.toLowerCase().includes(q);
        const matchesCustomer = sale.customerName?.toLowerCase().includes(q);
        const matchesPhone = sale.customerPhone?.toLowerCase().includes(q);
        const matchesStaff = sale.createdBy?.toLowerCase().includes(q);
        const matchesItem = sale.items?.some(
          (i) =>
            i.productName?.toLowerCase().includes(q) ||
            (i.sku && i.sku.toLowerCase().includes(q))
        );
        if (!matchesReceipt && !matchesCustomer && !matchesPhone && !matchesStaff && !matchesItem) {
          return false;
        }
      }

      // 2. Date Filter (using Africa/Accra business calendar)
      if (dateFilter === 'today') {
        if (!isTodayInAccra(sale.createdAt)) return false;
      } else if (dateFilter === 'yesterday') {
        if (!isYesterdayInAccra(sale.createdAt)) return false;
      } else if (dateFilter === 'week') {
        if (!isPast7DaysInAccra(sale.createdAt)) return false;
      } else if (dateFilter === 'month') {
        if (!isThisMonthInAccra(sale.createdAt)) return false;
      } else if (dateFilter === 'custom') {
        const saleDate = getAccraDateString(sale.createdAt);
        if (customStartDate && saleDate < customStartDate) return false;
        if (customEndDate && saleDate > customEndDate) return false;
      }

      // 3. Payment Method Filter
      if (paymentMethodFilter !== 'All') {
        if (paymentMethodFilter === 'Credit/Debt') {
          if (sale.paymentMethod !== 'Credit/Debt' && (!sale.balance || sale.balance <= 0)) {
            return false;
          }
        } else {
          if (sale.paymentMethod !== paymentMethodFilter) return false;
        }
      }

      // 4. Customer Filter
      if (customerFilter !== 'All') {
        if (customerFilter === 'walkin') {
          if (sale.customerId) return false;
        } else {
          if (sale.customerId !== customerFilter) return false;
        }
      }

      // 5. Staff Filter
      if (staffFilter !== 'All') {
        if (sale.createdBy !== staffFilter) return false;
      }

      return true;
    });
  }, [
    salesHistory,
    historySearch,
    dateFilter,
    customStartDate,
    customEndDate,
    paymentMethodFilter,
    customerFilter,
    staffFilter,
  ]);

  // If staff has no pos_sales permission, render clean permission denied view
  if (!hasPosPermission) {
    return (
      <div className="p-6 max-w-xl mx-auto my-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-800/80 text-amber-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-white">POS Sales Access Restricted</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your staff account does not currently have permission to access the Point of Sale register or record new sales.
          Please contact your shop administrator to enable the <span className="font-mono text-amber-400">pos_sales</span> permission.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-24 lg:pb-8">
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 sm:p-4 rounded-2xl border border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-400 hidden sm:inline" />
              <span>Sales & POS Register</span>
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold uppercase tracking-wider">
              Live POS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Fast checkout, instant stock deduction & thermal receipt generation
          </p>
        </div>

        <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            onClick={() => {
              setActiveTab('pos');
              setMobileView('products');
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[40px] ${
              activeTab === 'pos'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>POS Register</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[40px] ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Ledger ({salesHistory.length})</span>
          </button>
        </div>
      </div>

      {/* Notifications / Error Banner */}
      {error && (
        <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={() => setError('')}
            className="p-1 text-red-400 hover:text-white transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successToast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast('')}
            className="p-1 text-emerald-400 hover:text-white transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Product Selection Grid (7 cols) - conditionally hidden on mobile if mobileView === 'checkout' */}
          <div
            className={`lg:col-span-7 space-y-4 ${
              mobileView === 'checkout' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* Search Bar with clear button and Quick Stock Filter pills */}
            <div className="space-y-2.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="Search product name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 min-h-[44px]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white p-1 rounded-md"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Stock Level Filter Selector */}
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
                  <button
                    onClick={() => setStockFilter('all')}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                      stockFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({products.length})
                  </button>
                  <button
                    onClick={() => setStockFilter('in_stock')}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                      stockFilter === 'in_stock'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-emerald-400'
                    }`}
                    title="Products with stock > 0"
                  >
                    In Stock ({inStockCount})
                  </button>
                  <button
                    onClick={() => setStockFilter('low_stock')}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                      stockFilter === 'low_stock'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-amber-400'
                    }`}
                    title="Products at or below min stock level"
                  >
                    Low ({lowStockCount})
                  </button>
                </div>
              </div>

              {/* Category selector pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-thin">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[36px] ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            {loading ? (
              <div className="py-16 text-center text-slate-400 text-xs animate-pulse">
                Loading products catalog...
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[580px] overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.quantity <= 0;
                  const isLowStock = p.quantity > 0 && p.quantity <= p.minStockLevel;
                  const inCartItem = cart.find((item) => item.product.id === p.id);
                  const inCartQty = inCartItem?.quantity || 0;
                  const isMaxInCart = inCartQty >= p.quantity && p.quantity > 0;

                  return (
                    <button
                      key={p.id}
                      disabled={isOutOfStock}
                      onClick={() => addToCart(p)}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition group relative min-h-[120px] ${
                        isOutOfStock
                          ? 'bg-slate-900/30 border-slate-800/40 opacity-60 cursor-not-allowed'
                          : inCartQty > 0
                          ? 'bg-slate-900/90 border-emerald-500/70 shadow-md shadow-emerald-950/20'
                          : 'bg-slate-900 border-slate-800 hover:border-emerald-500/80 hover:shadow-lg hover:shadow-emerald-950/30'
                      }`}
                    >
                      {/* In-cart indicator badge */}
                      {inCartQty > 0 && (
                        <div className="absolute -top-2 -right-2 bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-md z-10 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          <span>x{inCartQty}</span>
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between items-start mb-1.5 gap-1">
                          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[80px]">
                            {p.sku || 'SKU-N/A'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                              isOutOfStock
                                ? 'bg-red-950 text-red-400 border border-red-800/60'
                                : isLowStock
                                ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {isOutOfStock ? '0 in stock' : isLowStock ? `${p.quantity} low` : `${p.quantity} left`}
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 group-hover:text-emerald-400 transition">
                          {p.name}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-black text-emerald-400">
                          {currency} {p.sellingPrice.toFixed(2)}
                        </span>
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                            isOutOfStock
                              ? 'bg-slate-800 text-slate-600'
                              : isMaxInCart
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                              : 'bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white'
                          }`}
                          title={isOutOfStock ? 'Out of stock' : isMaxInCart ? 'Max stock in cart' : 'Add to cart'}
                        >
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-3xl text-slate-500">
                <Store className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p className="text-xs font-semibold text-slate-400">No products found</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {searchQuery
                    ? `No product matches "${searchQuery}".`
                    : 'Add your first product to start selling.'}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Active Cart & Checkout (5 cols) - Shown on desktop or when mobileView === 'checkout' */}
          <div
            className={`lg:col-span-5 space-y-4 ${
              mobileView === 'products' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* Mobile Back Button to return to products catalog */}
            <div className="lg:hidden flex items-center justify-between pb-1">
              <button
                onClick={() => setMobileView('products')}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 py-2 px-3 rounded-xl bg-slate-900 border border-slate-800"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Add More Products</span>
              </button>
              <span className="text-xs text-slate-400 font-mono">
                {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <ReceiptIcon className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    Current Cart ({cart.length})
                  </h3>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {cart.length > 0 ? (
                  cart.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs gap-2"
                    >
                      <div className="truncate flex-1">
                        <p className="font-semibold text-slate-200 truncate">{product.name}</p>
                        <p className="text-[11px] text-emerald-400 font-mono">
                          {currency} {product.sellingPrice.toFixed(2)} each
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {/* Stepper with direct numeric quantity input */}
                        <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                          <button
                            onClick={() => updateCartQty(product.id, quantity - 1)}
                            className="p-1 text-slate-400 hover:text-white min-w-[24px] flex items-center justify-center"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={product.quantity}
                            value={quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) {
                                updateCartQty(product.id, val);
                              }
                            }}
                            className="w-10 bg-transparent text-center text-xs font-bold text-white focus:outline-hidden"
                          />
                          <button
                            onClick={() => updateCartQty(product.id, quantity + 1)}
                            disabled={quantity >= product.quantity}
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed min-w-[24px] flex items-center justify-center"
                            title={quantity >= product.quantity ? 'Max stock reached' : 'Increase quantity'}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="w-16 text-right font-bold text-white font-mono">
                          {currency} {(product.sellingPrice * quantity).toFixed(2)}
                        </span>

                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Cart is empty. Tap any product on the left to add.
                  </div>
                )}
              </div>

              {/* Customer Selector */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Customer</span>
                  </label>
                  {canAccessCustomers && (
                    <button
                      type="button"
                      onClick={() => setShowAddCustomer(!showAddCustomer)}
                      className="text-[11px] text-emerald-400 hover:underline font-medium"
                    >
                      {showAddCustomer ? 'Cancel' : '+ New Customer'}
                    </button>
                  )}
                </div>

                {showAddCustomer ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <input
                      type="text"
                      placeholder="Customer Name *"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Phone (WhatsApp) *"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Credit Limit (GH₵) - Optional"
                      value={newCustCreditLimit}
                      onChange={(e) => setNewCustCreditLimit(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddCustomer}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                    >
                      Save Customer
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => {
                          setSelectedCustomerId(e.target.value);
                          setWalkinName('');
                        }}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 min-h-[40px]"
                      >
                        <option value="">Walk-in Customer</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.phone})
                          </option>
                        ))}
                      </select>

                      {!selectedCustomerId && (
                        <input
                          type="text"
                          placeholder="Walk-in Name (Optional)"
                          value={walkinName}
                          onChange={(e) => setWalkinName(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 min-h-[40px]"
                        />
                      )}
                    </div>

                    {/* Customer Credit Status Pill */}
                    {currentCustomer && (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1.5">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="font-bold text-white">{currentCustomer.name}</span>
                          <span className="text-slate-400 font-mono">{currentCustomer.phone}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span>
                            Limit:{' '}
                            <strong className="text-slate-200">
                              {customerCreditLimit > 0
                                ? `${currency} ${customerCreditLimit.toFixed(2)}`
                                : 'No Limit'}
                            </strong>
                          </span>
                          <span>
                            Current Debt:{' '}
                            <strong
                              className={
                                customerCurrentDebt > 0 ? 'text-amber-400' : 'text-slate-300'
                              }
                            >
                              {currency} {customerCurrentDebt.toFixed(2)}
                            </strong>
                          </span>
                          {customerCreditLimit > 0 && (
                            <span>
                              Available:{' '}
                              <strong
                                className={
                                  availableCredit > 0 ? 'text-emerald-400' : 'text-rose-400'
                                }
                              >
                                {currency} {availableCredit.toFixed(2)}
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-300">Payment Method</label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {(['Cash', 'Mobile Money', 'Bank Transfer', 'Card', 'Credit/Debt'] as PaymentMethod[]).map(
                    (method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method);
                          if (method === 'Credit/Debt') {
                            setAmountPaid('0');
                          } else {
                            setAmountPaid('');
                          }
                        }}
                        className={`py-2 px-1.5 rounded-xl font-semibold transition text-center truncate min-h-[38px] ${
                          paymentMethod === method
                            ? 'bg-emerald-600 text-white font-bold shadow-xs'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {method}
                      </button>
                    )
                  )}
                </div>

                {/* Quick Ghana Cedi Tender Buttons when payment method is Cash */}
                {paymentMethod === 'Cash' && total > 0 && (
                  <div className="pt-1">
                    <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                      <span>Quick Cash Tender:</span>
                      <span className="text-emerald-400 font-mono">Total: {currency} {total.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickCash('exact')}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-[10px] rounded-lg border border-slate-700 transition"
                      >
                        Exact
                      </button>
                      {[10, 20, 50, 100, 200].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleQuickCash(amt)}
                          className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 text-[10px] font-medium rounded-lg border border-slate-800 transition"
                        >
                          GH₵ {amt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Credit / Debt Warnings */}
                {paymentMethod === 'Credit/Debt' && !selectedCustomerId && (
                  <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-300 text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span>Select a registered customer above for credit/debt sales.</span>
                  </div>
                )}

                {paymentMethod === 'Credit/Debt' &&
                  selectedCustomerId &&
                  customerCreditLimit > 0 &&
                  balance > availableCredit && (
                    <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-[11px] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>
                        Exceeds credit limit! Available credit is {currency}{' '}
                        {availableCredit.toFixed(2)}.
                      </span>
                    </div>
                  )}
              </div>

              {/* Totals & Discount Calculation */}
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono">
                    {currency} {subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span>Discount ({currency}):</span>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    step="any"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0.00"
                    className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span>Amount Paid / Tendered:</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={`${total.toFixed(2)}`}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>

                {changeDue > 0 && (
                  <div className="flex justify-between items-center text-teal-300 font-bold bg-teal-950/40 p-1.5 rounded-lg border border-teal-800/40">
                    <span>Change Due:</span>
                    <span className="font-mono text-sm">
                      {currency} {changeDue.toFixed(2)}
                    </span>
                  </div>
                )}

                {(paymentMethod === 'Credit/Debt' || balance > 0) && (
                  <div className="flex justify-between items-center text-slate-300 pt-1">
                    <span>Due Date (Optional):</span>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-hidden"
                    />
                  </div>
                )}

                <div className="flex justify-between text-sm sm:text-base font-black text-white pt-2 border-t border-slate-800">
                  <span>TOTAL TO PAY:</span>
                  <span className="text-emerald-400 font-mono">
                    {currency} {total.toFixed(2)}
                  </span>
                </div>

                {balance > 0 && (
                  <div className="flex justify-between text-xs font-bold text-amber-400 pt-1">
                    <span>Customer Debt Balance:</span>
                    <span className="font-mono">
                      {currency} {balance.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Submit Checkout Button */}
              <button
                onClick={handleCompleteSale}
                disabled={submitting || cart.length === 0}
                className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950/50 flex items-center justify-center space-x-2 disabled:opacity-50 min-h-[48px]"
              >
                <span>{submitting ? 'Recording Sale...' : 'Complete Sale & Issue Receipt'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Sales Ledger History Tab */
        <div className="space-y-4 sm:space-y-6">
          {/* 1. Today's Summary Metrics (Ghana / Africa/Accra Business Day) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {/* Today's Sales */}
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">Today's Sales</span>
                <div className="w-6 h-6 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                  <Store className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-base sm:text-lg font-black text-white font-mono">
                  {currency} {todayTotalValue.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Accra business day</div>
              </div>
            </div>

            {/* Transactions Count */}
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">Transactions</span>
                <div className="w-6 h-6 rounded-lg bg-teal-950/80 border border-teal-800/60 flex items-center justify-center text-teal-400">
                  <ReceiptIcon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-base sm:text-lg font-black text-white font-mono">
                  {todayTransactionCount}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {todayTransactionCount === 1 ? 'sale today' : 'sales today'}
                </div>
              </div>
            </div>

            {/* Cash Sales */}
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">Cash Sales</span>
                <div className="w-6 h-6 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                  <Banknote className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-base sm:text-lg font-black text-cyan-300 font-mono">
                  {currency} {todayCashTotal.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Physical cash</div>
              </div>
            </div>

            {/* Mobile Money */}
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">Mobile Money</span>
                <div className="w-6 h-6 rounded-lg bg-sky-950/80 border border-sky-800/60 flex items-center justify-center text-sky-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-base sm:text-lg font-black text-sky-300 font-mono">
                  {currency} {todayMomoTotal.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">MoMo received</div>
              </div>
            </div>

            {/* Credit Sales */}
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">Credit / Debt</span>
                <div className="w-6 h-6 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-base sm:text-lg font-black text-amber-300 font-mono">
                  {currency} {todayCreditTotal.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Unpaid / Debt</div>
              </div>
            </div>

            {/* Estimated Profit (Only visible to Authorized Roles) */}
            {canViewProfit && (
              <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">Est. Profit</span>
                  <div className="w-6 h-6 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                    {currency} {todayProfit.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Authoritative net</div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Filter Controls & Search */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>Completed Sales Ledger</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                    {filteredSalesHistory.length} {filteredSalesHistory.length === 1 ? 'sale' : 'sales'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">All transactions recorded under Africa/Accra business time</p>
              </div>

              {/* Quick Search */}
              <div className="relative w-full md:w-80">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search receipt #, customer, phone, item, cashier..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition"
                />
                {historySearch && (
                  <button
                    onClick={() => setHistorySearch('')}
                    className="absolute right-2.5 top-2.5 p-0.5 rounded-md text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Date Preset Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Date:</span>
              </span>
              {(
                [
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'week', label: 'This Week' },
                  { id: 'month', label: 'This Month' },
                  { id: 'custom', label: 'Custom Range' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setDateFilter(preset.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition min-h-[32px] ${
                    dateFilter === preset.id
                      ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-900'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              {/* Reset Filters button if any active */}
              {hasActiveHistoryFilters && (
                <button
                  onClick={handleResetHistoryFilters}
                  className="ml-auto px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            {/* Custom Date Range Selectors (if custom selected) */}
            {dateFilter === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-hidden"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-hidden"
                  />
                </div>
                {(customStartDate || customEndDate) && (
                  <button
                    onClick={() => {
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="text-[11px] text-slate-400 hover:text-white underline ml-auto"
                  >
                    Clear dates
                  </button>
                )}
              </div>
            )}

            {/* Secondary Filters: Method, Customer, Cashier */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Payment Method Filter */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden"
                >
                  <option value="All">All Payment Methods</option>
                  <option value="Cash">Cash</option>
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="Credit/Debt">Credit / Debt Sales</option>
                </select>
              </div>

              {/* Customer Filter */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Customer
                </label>
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden"
                >
                  <option value="All">All Customers</option>
                  <option value="walkin">Walk-in Customers Only</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cashier / Staff Filter */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Attendant / Cashier
                </label>
                <select
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden"
                >
                  <option value="All">All Staff / Cashiers</option>
                  {staffList.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Transaction Ledger Table / Cards */}
          {filteredSalesHistory.length > 0 ? (
            <div className="space-y-3">
              {/* Desktop Table (Hidden on Mobile) */}
              <div className="hidden lg:block bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/50">
                        <th className="py-3 px-4">Receipt No</th>
                        <th className="py-3 px-4">Accra Date & Time</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Items</th>
                        <th className="py-3 px-4">Total</th>
                        <th className="py-3 px-4">Status / Paid</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Cashier</th>
                        {canViewProfit && <th className="py-3 px-4">Profit</th>}
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredSalesHistory.map((sale) => (
                        <tr
                          key={sale.id}
                          className="hover:bg-slate-800/40 transition cursor-pointer"
                          onClick={() => setSelectedSaleForDetails(sale)}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                            {sale.receiptNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {formatAccraDateTime(sale.createdAt)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-200">{sale.customerName}</div>
                            {sale.customerPhone && (
                              <div className="text-[10px] text-slate-400 font-mono">{sale.customerPhone}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 max-w-[220px]">
                            <div className="text-slate-300 truncate font-medium">
                              {sale.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-white font-mono whitespace-nowrap">
                            {currency} {sale.total.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {sale.balance > 0 ? (
                              <div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800/60">
                                  Debt: {currency} {sale.balance.toFixed(2)}
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Paid: {currency} {sale.amountPaid.toFixed(2)}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                                Paid Full
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] text-slate-300 font-medium">
                              {sale.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                            {sale.createdBy || 'Staff'}
                          </td>
                          {canViewProfit && (
                            <td className="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                              {sale.profit !== undefined ? `+${currency} ${sale.profit.toFixed(2)}` : '—'}
                            </td>
                          )}
                          <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => setSelectedSaleForDetails(sale)}
                                title="View transaction details"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onOpenReceipt(sale)}
                                title="Reprint thermal receipt"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-800/70 hover:bg-emerald-800 text-emerald-300 text-[11px] font-bold transition flex items-center gap-1 min-h-[32px]"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Receipt</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Transaction Cards (Visible on Small / Tablet Screens) */}
              <div className="block lg:hidden space-y-2.5">
                {filteredSalesHistory.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
                  >
                    {/* Top Row: Receipt #, Status, Time */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                          {sale.receiptNumber}
                        </span>
                        {sale.balance > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800/60">
                            Debt
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                            Paid
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatAccraDateTime(sale.createdAt)}
                      </span>
                    </div>

                    {/* Customer & Cashier */}
                    <div className="flex items-center justify-between text-xs border-y border-slate-800/80 py-2">
                      <div>
                        <div className="font-bold text-white">{sale.customerName}</div>
                        {sale.customerPhone && (
                          <div className="text-[10px] text-slate-400 font-mono">{sale.customerPhone}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Attendant</span>
                        <span className="text-slate-300 font-medium">{sale.createdBy || 'Staff'}</span>
                      </div>
                    </div>

                    {/* Items Summary & Financials */}
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-[11px] text-slate-400">
                          {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                        </div>
                        <div className="flex items-center space-x-1.5 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-medium">
                            {sale.paymentMethod}
                          </span>
                          {canViewProfit && sale.profit !== undefined && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-800/50 text-[10px] font-mono text-emerald-400 font-bold">
                              Profit: +{currency} {sale.profit.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black text-white font-mono">
                          {currency} {sale.total.toFixed(2)}
                        </div>
                        {sale.balance > 0 && (
                          <div className="text-[10px] text-amber-400 font-mono font-bold">
                            Owes: {currency} {sale.balance.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions: Details & Reprint Receipt */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                      <button
                        onClick={() => setSelectedSaleForDetails(sale)}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition min-h-[44px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>

                      <button
                        onClick={() => onOpenReceipt(sale)}
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm shadow-emerald-950 min-h-[44px]"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <ReceiptIcon className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">No sales transactions found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {hasActiveHistoryFilters
                  ? 'No sales records match your current search and filter criteria.'
                  : 'No sales transactions have been recorded for this business yet.'}
              </p>

              {hasActiveHistoryFilters ? (
                <button
                  onClick={handleResetHistoryFilters}
                  className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear All Filters</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setActiveTab('pos');
                    setMobileView('products');
                  }}
                  className="mt-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Open POS Register</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Sale Details Modal */}
      {selectedSaleForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base sm:text-lg font-bold text-white">Sale Transaction Details</h3>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-800/60 font-mono font-bold text-emerald-400 text-xs">
                    {selectedSaleForDetails.receiptNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Recorded on {formatAccraDateTime(selectedSaleForDetails.createdAt)} (Accra Time)
                </p>
              </div>

              <button
                onClick={() => setSelectedSaleForDetails(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Customer</span>
                <span className="font-bold text-white block truncate">{selectedSaleForDetails.customerName}</span>
                {selectedSaleForDetails.customerPhone && (
                  <span className="text-[10px] text-slate-400 font-mono">{selectedSaleForDetails.customerPhone}</span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Payment</span>
                <span className="font-bold text-slate-200">{selectedSaleForDetails.paymentMethod}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status</span>
                {selectedSaleForDetails.balance > 0 ? (
                  <span className="text-amber-400 font-bold">Debt Owed</span>
                ) : (
                  <span className="text-emerald-400 font-bold">Fully Paid</span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cashier</span>
                <span className="text-slate-300 font-medium">{selectedSaleForDetails.createdBy || 'Staff'}</span>
              </div>
            </div>

            {/* Items Breakdown Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Purchased Items</h4>
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950">
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      {canViewProfit && <th className="py-2.5 px-3 text-right">Profit</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedSaleForDetails.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-white">{item.productName}</div>
                          {item.sku && <div className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-300">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          {currency} {item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                          {currency} {item.total.toFixed(2)}
                        </td>
                        {canViewProfit && (
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-semibold">
                            {item.profit !== undefined ? `+${currency} ${item.profit.toFixed(2)}` : '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-200">
                  {currency} {selectedSaleForDetails.subtotal.toFixed(2)}
                </span>
              </div>

              {selectedSaleForDetails.discount > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Discount Applied:</span>
                  <span className="font-mono">
                    -{currency} {selectedSaleForDetails.discount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-white pt-1.5 border-t border-slate-800">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-400">
                  {currency} {selectedSaleForDetails.total.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-slate-400 pt-1">
                <span>Amount Paid:</span>
                <span className="font-mono text-white">
                  {currency} {selectedSaleForDetails.amountPaid.toFixed(2)}
                </span>
              </div>

              {selectedSaleForDetails.amountPaid > selectedSaleForDetails.total && (
                <div className="flex justify-between text-emerald-400">
                  <span>Change Given:</span>
                  <span className="font-mono font-bold">
                    {currency} {(selectedSaleForDetails.amountPaid - selectedSaleForDetails.total).toFixed(2)}
                  </span>
                </div>
              )}

              {selectedSaleForDetails.balance > 0 && (
                <div className="flex justify-between text-amber-400 font-bold pt-1">
                  <span>Outstanding Debt Balance:</span>
                  <span className="font-mono">
                    {currency} {selectedSaleForDetails.balance.toFixed(2)}
                  </span>
                </div>
              )}

              {selectedSaleForDetails.dueDate && (
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Payment Due Date:</span>
                  <span className="font-mono text-amber-300">{selectedSaleForDetails.dueDate}</span>
                </div>
              )}

              {/* Profit Breakdown (Only visible to Authorized Roles) */}
              {canViewProfit && selectedSaleForDetails.profit !== undefined && (
                <div className="flex justify-between text-emerald-400 font-bold pt-1.5 border-t border-slate-800">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Net Sale Profit:</span>
                  </span>
                  <span className="font-mono">
                    +{currency} {selectedSaleForDetails.profit.toFixed(2)}
                  </span>
                </div>
              )}

              {selectedSaleForDetails.notes && (
                <div className="pt-2 border-t border-slate-800 text-slate-400 text-[11px]">
                  <span className="font-bold text-slate-300 block mb-0.5">Notes:</span>
                  <p className="italic">{selectedSaleForDetails.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedSaleForDetails(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition min-h-[40px]"
              >
                Close
              </button>

              <button
                onClick={() => {
                  const s = selectedSaleForDetails;
                  setSelectedSaleForDetails(null);
                  onOpenReceipt(s);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm shadow-emerald-950 flex items-center gap-1.5 min-h-[40px]"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>View / Reprint Thermal Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Cart Dock for Mobile View */}
      {activeTab === 'pos' && mobileView === 'products' && cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden animate-slideUp">
          <button
            onClick={() => setMobileView('checkout')}
            className="w-full p-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-2xl flex items-center justify-between text-white font-bold border border-emerald-400/30"
          >
            <div className="flex items-center space-x-2 text-left">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black leading-tight">
                  {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'} in cart
                </p>
                <p className="text-[10px] text-emerald-100 font-mono font-normal">
                  Tap to review & checkout
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm font-black font-mono">
                {currency} {total.toFixed(2)}
              </span>
              <div className="py-1 px-2.5 bg-white text-emerald-900 rounded-xl text-xs font-black">
                Pay →
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
