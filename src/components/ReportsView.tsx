import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  DollarSign,
  Boxes,
  Wallet,
  ArrowDownRight,
  TrendingDown,
  PieChart as PieChartIcon,
  Filter,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../services/api.js';
import type { FinancialReport, Business } from '../types/index.js';
import { StaffIntelligenceModal } from './StaffIntelligenceModal.js';

interface ReportsViewProps {
  business: Business | null;
}

const COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#f43f5e'];

export const ReportsView: React.FC<ReportsViewProps> = ({ business }) => {
  const [reportType, setReportType] = useState<
    'profit' | 'expenses' | 'inventory' | 'products' | 'debtors'
  >('profit');
  const [dateRange, setDateRange] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStaffIntelligenceModal, setShowStaffIntelligenceModal] = useState(false);

  const currency = business?.currency || 'GH₵';

  const loadReport = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getReports(dateRange, startDate, endDate);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate financial reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [dateRange, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  // Safe normalized numbers and lists
  const totalRevenue = Number(report?.totalRevenue) || 0;
  const costOfGoods = Number(report?.costOfGoods ?? report?.totalCost) || 0;
  const grossProfit = Number(report?.grossProfit) || 0;
  const grossMargin = Number(report?.grossMargin ?? (totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0)) || 0;
  const totalExpenses = Number(report?.totalExpenses) || 0;
  const netProfit = Number(report?.netProfit) || 0;
  const totalDebt = Number(report?.totalDebtOwed ?? report?.totalCustomerDebt) || 0;
  const purchasesTotal = Number(report?.purchasesTotal) || 0;
  const purchaseCount = Number(report?.purchaseCount) || 0;
  const salesCount = Number(report?.salesCount) || 0;
  const avgTxnValue = Number(report?.averageTransactionValue) || (salesCount > 0 ? totalRevenue / salesCount : 0);
  const debtorsCount = Number(report?.debtorsCount) || 0;
  const topDebtors = report?.topDebtors || [];
  const purchasesBySupplier = report?.purchasesBySupplier || [];
  const salesByPaymentMethod = report?.salesByPaymentMethod || [];
  const expensesByPaymentMethod = report?.expensesByPaymentMethod || [];
  const highestExpenseCategory = report?.highestExpenseCategory;

  const invVal = report?.inventoryValuation || (report as any)?.inventory || {
    totalQuantity: 0,
    totalCostValue: 0,
    totalRetailValue: 0,
    potentialProfit: 0,
  };
  const totalInventoryCost = Number(invVal.totalCostValue ?? (invVal as any).costValue) || 0;
  const totalInventoryRetail = Number(invVal.totalRetailValue ?? (invVal as any).retailValue) || 0;
  const potentialProfit = Number(invVal.potentialProfit ?? (invVal as any).expectedProfit) || 0;

  const expensesList: { category: string; amount: number }[] = Array.isArray(report?.expensesByCategory)
    ? report.expensesByCategory.map((e) => ({
        category: String(e.category || 'Other'),
        amount: Number(e.amount) || 0,
      }))
    : report?.expenseByCategory
    ? Object.entries(report.expenseByCategory).map(([category, amount]) => ({
        category,
        amount: Number(amount) || 0,
      }))
    : [];

  const topProductsList: {
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
    profit?: number;
  }[] = Array.isArray(report?.topProducts)
    ? report.topProducts.map((p) => ({
        productId: String(p.productId || ''),
        productName: String(p.productName || 'Unnamed Product'),
        totalQuantity: Number(p.totalQuantity) || 0,
        totalRevenue: Number(p.totalRevenue) || 0,
        profit: Number(p.profit ?? p.totalProfit) || 0,
      }))
    : Array.isArray((report as any)?.productPerformance)
    ? (report as any).productPerformance.map((p: any) => ({
        productId: String(p.productId || ''),
        productName: String(p.name || p.productName || 'Unnamed Product'),
        totalQuantity: Number(p.qtySold ?? p.totalQuantity) || 0,
        totalRevenue: Number(p.revenue ?? p.totalRevenue) || 0,
        profit: Number(p.profit) || 0,
      }))
    : [];

  const handleExportCSV = () => {
    if (!report) return;

    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportType === 'profit') {
      csvContent += 'Financial Metric,Amount (GHS)\n';
      csvContent += `Total Revenue,${totalRevenue.toFixed(2)}\n`;
      csvContent += `Cost of Goods Sold (COGS),${costOfGoods.toFixed(2)}\n`;
      csvContent += `Gross Profit,${grossProfit.toFixed(2)}\n`;
      csvContent += `Operating Expenses,${totalExpenses.toFixed(2)}\n`;
      csvContent += `Net Profit,${netProfit.toFixed(2)}\n`;
      if (purchasesTotal > 0) {
        csvContent += `Stock-In Purchases (Capital Outflow),${purchasesTotal.toFixed(2)}\n`;
      }
    } else if (reportType === 'expenses') {
      csvContent += 'Category,Amount (GHS)\n';
      expensesList.forEach((e) => {
        csvContent += `"${e.category}",${e.amount.toFixed(2)}\n`;
      });
    } else if (reportType === 'products') {
      csvContent += 'Product Name,Units Sold,Revenue (GHS)\n';
      topProductsList.forEach((p) => {
        csvContent += `"${p.productName}",${p.totalQuantity},${p.totalRevenue.toFixed(2)}\n`;
      });
    } else if (reportType === 'inventory') {
      csvContent += 'Inventory Valuation Metric,Amount (GHS)\n';
      csvContent += `Total Stock Buying Cost,${totalInventoryCost.toFixed(2)}\n`;
      csvContent += `Total Expected Sales Revenue,${totalInventoryRetail.toFixed(2)}\n`;
      csvContent += `Expected Gross Margin,${potentialProfit.toFixed(2)}\n`;
    } else if (reportType === 'debtors') {
      csvContent += 'Financial Metric,Amount (GHS)\n';
      csvContent += `Total Outstanding Receivables Owed,${totalDebt.toFixed(2)}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BusinessManagerGH_${reportType}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Financial & Analytics Reports
          </h1>
          <p className="text-xs text-slate-400">
            Audit-ready P&L statements, Gross vs Net profit, and stock valuation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStaffIntelligenceModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold border border-indigo-500/30 transition shadow-lg"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Staff & Operations Intelligence</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 space-y-3">
        {/* Report Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'profit', label: 'P&L Statement (Net Profit)' },
            { id: 'expenses', label: 'Expenses Breakdown' },
            { id: 'inventory', label: 'Inventory Valuation' },
            { id: 'products', label: 'Product Performance' },
            { id: 'debtors', label: 'Debtors & Receivables' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setReportType(t.id as any)}
              className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition ${
                reportType === t.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Date Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" /> Period:
          </span>

          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'this_week', label: 'This Week' },
            { id: 'last_week', label: 'Last Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'custom', label: 'Custom Range' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDateRange(d.id)}
              className={`px-2.5 py-1 rounded-lg transition text-[11px] ${
                dateRange === d.id
                  ? 'bg-slate-800 text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {d.label}
            </button>
          ))}

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 pl-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white"
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 animate-pulse">
          Computing real financial calculations...
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* PROFIT & LOSS VIEW */}
          {reportType === 'profit' && (
            <div className="space-y-6">
              {/* 5 Key Metric Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400">Total Revenue</span>
                  <p className="text-lg font-black text-white mt-1">
                    {currency} {totalRevenue.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500">(Selling price x Qty)</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400">Cost of Goods</span>
                  <p className="text-lg font-black text-slate-400 mt-1">
                    {currency} {costOfGoods.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500">(Buying price x Qty)</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400">Gross Profit</span>
                  <p className="text-lg font-black text-teal-400 mt-1">
                    {currency} {grossProfit.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500">(Revenue - Cost)</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400">Total Expenses</span>
                  <p className="text-lg font-black text-red-400 mt-1">
                    {currency} {totalExpenses.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500">(Rent, ECG, Salaries...)</span>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border-2 border-emerald-500/50">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase">
                    True Net Profit
                  </span>
                  <p
                    className={`text-xl font-black mt-1 ${
                      netProfit >= 0 ? 'text-emerald-300' : 'text-rose-400'
                    }`}
                  >
                    {currency} {netProfit.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-emerald-400/80">(Gross Profit - Expenses)</span>
                </div>
              </div>

              {/* Profit & Loss Table */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-white">Profit & Loss Summary Ledger</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-400 text-xs font-bold border border-teal-500/20">
                      Gross Margin: {grossMargin.toFixed(1)}%
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                      Avg Sale: {currency} {avgTxnValue.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-slate-800/60">
                      <tr className="py-2.5">
                        <td className="py-2.5 font-bold text-slate-200">1. Gross Sales Revenue</td>
                        <td className="py-2.5 text-right font-black text-white font-mono text-sm">
                          {currency} {totalRevenue.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="py-2.5">
                        <td className="py-2.5 text-slate-400 pl-4">
                          Less: Cost of Goods Sold (Inventory Buying Cost)
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-400">
                          - {currency} {costOfGoods.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="py-2.5 bg-slate-950/40 font-bold">
                        <td className="py-2.5 text-teal-400">2. GROSS PROFIT (Trading Margin)</td>
                        <td className="py-2.5 text-right font-mono text-teal-400 font-black text-sm">
                          {currency} {grossProfit.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="py-2.5">
                        <td className="py-2.5 text-slate-400 pl-4">
                          Less: Operating Expenses (Utilities, Transport, Overhead)
                        </td>
                        <td className="py-2.5 text-right font-mono text-rose-400">
                          - {currency} {totalExpenses.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="py-3 bg-emerald-950/20 font-black border-t-2 border-emerald-500">
                        <td className="py-3 text-emerald-400 text-sm">
                          3. NET PROFIT FOR PERIOD
                        </td>
                        <td
                          className={`py-3 text-right font-mono text-base font-black ${
                            netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {currency} {netProfit.toFixed(2)}
                        </td>
                      </tr>
                      {purchasesTotal > 0 && (
                        <tr className="py-2.5 bg-slate-950/20 text-slate-400">
                          <td className="py-2.5 pl-4 italic">
                            Informational: Stock Purchases / Restocking Inflow in Period ({purchaseCount} order{purchaseCount === 1 ? '' : 's'})
                          </td>
                          <td className="py-2.5 text-right font-mono text-slate-400">
                            {currency} {purchasesTotal.toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Sales By Payment Method Summary */}
                {salesByPaymentMethod.length > 0 && (
                  <div className="pt-4 border-t border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Sales by Payment Method
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {salesByPaymentMethod.map((pm) => (
                        <div key={pm.method} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-semibold">{pm.method}</span>
                          <p className="text-xs font-black text-white font-mono mt-0.5">
                            {currency} {pm.amount.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EXPENSES BREAKDOWN */}
          {reportType === 'expenses' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white">Expense Distribution by Category</h3>
                {expensesList.length > 0 && expensesList.some((e) => e.amount > 0) ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensesList}
                          dataKey="amount"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }: any) =>
                            `${name} (${((Number(percent) || 0) * 100).toFixed(0)}%)`
                          }
                          labelLine={false}
                        >
                          {expensesList.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: any) => [`${currency} ${(Number(val) || 0).toFixed(2)}`, '']}
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-12 text-center">
                    No expenses recorded in this timeframe.
                  </p>
                )}
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white">Category Ledger</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400">
                        <th className="pb-2">Category</th>
                        <th className="pb-2 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {expensesList.length > 0 ? (
                        expensesList.map((cat) => (
                          <tr key={cat.category}>
                            <td className="py-2.5 font-semibold text-slate-300">{cat.category}</td>
                            <td className="py-2.5 text-right font-bold text-red-400 font-mono">
                              {currency} {cat.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="py-6 text-center text-slate-500">
                            No expense records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* INVENTORY VALUATION */}
          {reportType === 'inventory' && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white">Stock Valuation Audit</h3>
                <p className="text-xs text-slate-400">
                  Total capital tied up in current inventory vs expected retail yield
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-semibold text-slate-400">
                    Total Inventory Cost (Capital)
                  </span>
                  <p className="text-xl font-black text-white mt-1">
                    {currency} {totalInventoryCost.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    Sum of (Buying Price x Stock)
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-semibold text-slate-400">
                    Expected Retail Value
                  </span>
                  <p className="text-xl font-black text-emerald-400 mt-1">
                    {currency} {totalInventoryRetail.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    Sum of (Selling Price x Stock)
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-semibold text-slate-400">
                    Expected Unrealized Profit
                  </span>
                  <p className="text-xl font-black text-teal-400 mt-1">
                    {currency} {potentialProfit.toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500">Gross margin when all sold</span>
                </div>
              </div>
            </div>
          )}

          {/* PRODUCT PERFORMANCE */}
          {reportType === 'products' && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white">Top Performing Products</h3>
              {topProductsList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400">
                        <th className="pb-2">Product Name</th>
                        <th className="pb-2">Units Sold</th>
                        <th className="pb-2 text-right">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {topProductsList.map((p, idx) => (
                        <tr key={p.productId || idx}>
                          <td className="py-3 font-bold text-slate-200">{p.productName}</td>
                          <td className="py-3 text-slate-300">{p.totalQuantity} units</td>
                          <td className="py-3 text-right font-bold text-emerald-400 font-mono">
                            {currency} {p.totalRevenue.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-12 text-center">
                  No products sold in this period.
                </p>
              )}
            </div>
          )}

          {/* DEBTORS & RECEIVABLES */}
          {reportType === 'debtors' && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Outstanding Receivables</h3>
                  <p className="text-xs text-slate-400">
                    {debtorsCount} customer{debtorsCount === 1 ? '' : 's'} with active debt balances
                  </p>
                </div>
                <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-right">
                  <span className="text-[10px] uppercase font-bold text-amber-400/80 block">Total Receivables</span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    {currency} {totalDebt.toFixed(2)}
                  </span>
                </div>
              </div>

              {topDebtors.length > 0 ? (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-300">Top Debtors</span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400">
                          <th className="pb-2">Customer Name</th>
                          <th className="pb-2">Phone</th>
                          <th className="pb-2 text-right">Current Debt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {topDebtors.map((d) => (
                          <tr key={d.id}>
                            <td className="py-2.5 font-semibold text-slate-200">{d.name}</td>
                            <td className="py-2.5 text-slate-400">{d.phone || '—'}</td>
                            <td className="py-2.5 text-right font-black text-amber-400 font-mono">
                              {currency} {d.currentDebt.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No outstanding debtors. All customer balances are clear!
                </p>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Staff Operations & Performance Intelligence Modal */}
      <StaffIntelligenceModal
        isOpen={showStaffIntelligenceModal}
        onClose={() => setShowStaffIntelligenceModal(false)}
        business={business}
      />
    </div>
  );
};
