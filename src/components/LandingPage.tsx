import React, { useState } from 'react';
import {
  Store,
  TrendingUp,
  Boxes,
  Users,
  Receipt,
  MessageSquare,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  Calculator,
  PieChart,
  Smartphone,
  Check,
  ChevronRight,
  BadgeAlert,
  CreditCard,
  Menu,
  X,
} from 'lucide-react';
import type { BusinessType } from '../types/index.js';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const businessTypes: { name: BusinessType; tag: string }[] = [
    { name: 'Provision Shop', tag: 'Fast Barcode & Stock Tracking' },
    { name: 'Boutique', tag: 'Sizes, Colors & Debtor Books' },
    { name: 'Cosmetics', tag: 'Expiry & Supplier Invoicing' },
    { name: 'Electronics', tag: 'Serial/SKU & Margin Calc' },
    { name: 'Restaurant', tag: 'Daily Cashup & Expense Books' },
    { name: 'Phone Shop', tag: 'Accessories & MoMo Tracking' },
    { name: 'Spare Parts', tag: 'Wholesale & Reorder Alerts' },
    { name: 'Salon', tag: 'Services, Retail & Clients' },
    { name: 'Wholesale', tag: 'Bulk Pricing & Customer Credit' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0 mr-2 sm:mr-6 lg:mr-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-950/40 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="flex items-center">
              <span className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap">
                Business Manager <span className="text-emerald-400 font-extrabold ml-0.5">GH</span>
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition whitespace-nowrap">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition whitespace-nowrap">
              How It Works
            </a>
            <a href="#businesses" className="hover:text-emerald-400 transition whitespace-nowrap">
              For Ghanaian Shops
            </a>
            <a href="#pricing" className="hover:text-emerald-400 transition whitespace-nowrap">
              Pricing
            </a>
          </nav>

          {/* Action Buttons & Mobile Trigger */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={onLogin}
              className="whitespace-nowrap px-3.5 sm:px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition border border-transparent hover:border-slate-700/80"
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="hidden sm:inline-flex whitespace-nowrap px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-md shadow-emerald-950/50 items-center gap-1.5"
            >
              <span>GET STARTED FREE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 py-4 space-y-3">
            <nav className="flex flex-col space-y-1 text-xs font-semibold text-slate-300">
              <a
                href="#features"
                onClick={() => setMobileNavOpen(false)}
                className="px-3 py-2.5 rounded-xl hover:bg-slate-900 hover:text-emerald-400 transition"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileNavOpen(false)}
                className="px-3 py-2.5 rounded-xl hover:bg-slate-900 hover:text-emerald-400 transition"
              >
                How It Works
              </a>
              <a
                href="#businesses"
                onClick={() => setMobileNavOpen(false)}
                className="px-3 py-2.5 rounded-xl hover:bg-slate-900 hover:text-emerald-400 transition"
              >
                For Ghanaian Shops
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileNavOpen(false)}
                className="px-3 py-2.5 rounded-xl hover:bg-slate-900 hover:text-emerald-400 transition"
              >
                Pricing
              </a>
            </nav>
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  onGetStarted();
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50"
              >
                <span>GET STARTED FREE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 1. Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-semibold mb-6">
            <Zap className="w-3.5 h-3.5" />
            <span>Built specifically for Ghanaian Retailers & Enterprises</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto uppercase leading-tight font-sans">
            MANAGE YOUR BUSINESS. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              KNOW YOUR NUMBERS.
            </span>{' '}
            <br />
            GROW SMARTER.
          </h1>

          <p className="mt-6 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Business Manager GH helps small businesses track sales, inventory, expenses, customers and profit — all in one simple platform.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs tracking-wider uppercase transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
            >
              <span>GET STARTED FREE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-1.5"
            >
              <span>SEE HOW IT WORKS</span>
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Currency</span>
              <p className="text-lg font-bold text-white mt-0.5">Ghana Cedi (GH₵)</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Customer Communication</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">WhatsApp Deep Links</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Profit Tracking</span>
              <p className="text-lg font-bold text-white mt-0.5">Gross & Net Real-time</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Device Support</span>
              <p className="text-lg font-bold text-teal-400 mt-0.5">Phone, Tablet, PC</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Target Ghanaian Businesses Showcase */}
      <section id="businesses" className="py-16 bg-slate-900/40 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
              Engineered For Ghana
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              Tailored for Every Small Business
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Whether you are running a shop in Makola, Kejetia, Osu, Tamale, or Takoradi, Business Manager GH gives you total control.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {businessTypes.map((b, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition">
                    {b.name}
                  </h3>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                    GH₵ Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400">{b.tag}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Core Features */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
              Everything You Need
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              Run Your Entire Daily Operation
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Replace messy paper receipt books, lost debt records, and confusing inventory counts with one reliable application.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Fast POS & WhatsApp Receipts
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sell in seconds with Cash, Mobile Money (MoMo), Bank, or Credit. Print thermal receipts or send formatted e-receipts directly to customers via WhatsApp.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                <Boxes className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Automated Inventory & Stock Alerts
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Stock automatically decreases when you sell and increases when you record supplier purchases. Receive instant alerts for LOW STOCK and OUT OF STOCK items.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Debtors & Debt Reminders
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Never lose track of credit sales again. Track who owes you, partial payments, overdue balances, and send polite payment reminders directly via WhatsApp.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Real Profit & Expense Analytics
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Know your real numbers daily. Clear distinction between Gross Profit (Revenue - Cost of Goods) and Net Profit (after Rent, ECG, Salaries, Transport).
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Invoicing & Quotations
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate professional Ghanaian invoices with itemized tables, payment terms, and status tracking (Draft, Sent, Partially Paid, Paid, Overdue).
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Data Isolation & Audit Logs
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Strict multi-tenant security guarantees that your business records are private to you. Full audit logging tracks every sale, product addition, and edit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How It Works */}
      <section id="how-it-works" className="py-20 bg-slate-900/50 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
              Simple 3-Step Setup
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">How It Works</p>
            <p className="text-xs text-slate-400 mt-2">
              Get your shop up and running in under 2 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-base font-bold font-mono">
                1
              </div>
              <h3 className="text-base font-bold text-white mb-2">Register & Add Products</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your business name, city, and add your products with their buying and selling prices in Ghana Cedis.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-base font-bold font-mono">
                2
              </div>
              <h3 className="text-base font-bold text-white mb-2">Record Sales & Issues</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pick products, select payment methods (Cash, MoMo, or Debt), and issue instant receipts or WhatsApp confirmations.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-base font-bold font-mono">
                3
              </div>
              <h3 className="text-base font-bold text-white mb-2">Watch Your Profit Grow</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Review your daily net profits, stock valuations, expense sheets, and collect all money owed with ease.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Pricing (Requirement 28) */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
              Transparent Pricing
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              Plans for Businesses of Any Size
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Start completely free today. Upgrade anytime as your business expands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  FREE PLAN
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">GH₵0</span>
                  <span className="text-xs text-slate-400">/month</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Perfect for new solo shops getting started.
                </p>

                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Up to 50 Products</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Daily Sales & POS System</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Basic WhatsApp Receipts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Expense Logging</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onGetStarted}
                className="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                GET STARTED FREE
              </button>
            </div>

            {/* Starter */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/40 border-2 border-emerald-500 flex flex-col justify-between relative shadow-xl shadow-emerald-950/40">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                MOST POPULAR
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  STARTER
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">GH₵49</span>
                  <span className="text-xs text-slate-400">/month</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  For growing shops requiring debt tracking and stock alerts.
                </p>

                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unlimited Products & Inventory</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Customer & Debtor Management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>1-Click WhatsApp Debt Reminders</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Supplier & Purchase Tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Detailed Profit & Margin Reports</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onGetStarted}
                className="mt-8 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-md shadow-emerald-950/50"
              >
                START WITH STARTER
              </button>
            </div>

            {/* Business */}
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  BUSINESS
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">GH₵99</span>
                  <span className="text-xs text-slate-400">/month</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  For established wholesalers, salons, and multi-staff shops.
                </p>

                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Everything in Starter Plan</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Full Invoicing & Quotations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Multi-staff Audit Logs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Custom Thermal Branding</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Priority Support</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onGetStarted}
                className="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                GET BUSINESS PLAN
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Call to Action */}
      <section className="py-20 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight">
            RUN YOUR BUSINESS. TRACK YOUR MONEY. GROW WITH CONFIDENCE.
          </h2>
          <p className="mt-4 text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Join hundreds of forward-thinking Ghanaian shop owners who run their daily business with clarity and speed.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-xl shadow-emerald-950/60 flex items-center gap-2"
            >
              <span>GET STARTED FREE TODAY</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="py-12 bg-slate-950 border-t border-slate-900 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              <Store className="w-4 h-4" />
            </div>
            <span className="text-white font-bold text-sm">Business Manager GH</span>
          </div>

          <p className="text-slate-500 text-center sm:text-left">
            &copy; {new Date().getFullYear()} Business Manager GH. All rights reserved. Accra, Ghana.
          </p>

          <div className="flex items-center space-x-6 text-slate-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <button onClick={onLogin} className="hover:text-white transition">Sign In</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
