import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  PackageX,
  PackageCheck,
  Package,
  Boxes,
  DollarSign,
  Calendar,
  RefreshCw,
  Clock,
  Building2,
  Layers,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api.js';
import type {
  Business,
  InventoryIntelligence,
  Product,
} from '../types/index.js';

interface InventoryIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
  onSelectProductForAdjustment?: (product: Product) => void;
}

export const InventoryIntelligenceModal: React.FC<InventoryIntelligenceModalProps> = ({
  isOpen,
  onClose,
  business,
  onSelectProductForAdjustment,
}) => {
  const [data, setData] = useState<InventoryIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRange, setSelectedRange] = useState('this_month');
  const [activeTab, setActiveTab] = useState<'alerts' | 'velocity' | 'categories' | 'suppliers' | 'ledger'>('alerts');

  const currency = business?.currency || 'GH₵';

  const loadIntelligence = async (rangeValue = selectedRange) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getInventoryIntelligence({ range: rangeValue });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory intelligence analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadIntelligence(selectedRange);
    }
  }, [isOpen, selectedRange]);

  if (!isOpen) return null;

  const overview = data?.overview;
  const canViewFinancials = overview?.inventoryCostValue !== undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between gap-4 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Inventory Intelligence & Stock Control
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  Accra (GMT)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Server-authoritative inventory valuation, velocity tracking, and stock shortfall analysis
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadIntelligence()}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition disabled:opacity-50"
              title="Refresh intelligence metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="px-5 sm:px-6 py-3 bg-slate-950/60 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
            <span className="text-slate-400 mr-1 flex items-center font-medium">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Velocity Period:
            </span>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'This Week' },
              { id: 'last_week', label: 'Last Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'all_time', label: 'All Time' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setSelectedRange(btn.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  selectedRange === btn.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-950'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {data?.dateRange && (
            <div className="text-[11px] text-slate-400 font-mono">
              Window: {data.dateRange.startDate} → {data.dateRange.endDate} ({data.dateRange.label})
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-2xl text-red-300 text-xs flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Overview Cards */}
          {overview && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Catalog</span>
                  <Boxes className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-xl font-black text-white">{overview.totalProducts}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Active catalog items</div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Total Units</span>
                  <Package className="w-3.5 h-3.5 text-teal-400" />
                </div>
                <div className="text-xl font-black text-white">{overview.totalStockUnits.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Physical items on hand</div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>In Stock</span>
                  <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-black text-emerald-400">{overview.inStockCount}</div>
                <div className="text-[10px] text-emerald-500/70 mt-0.5">Healthy inventory</div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Low Stock</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xl font-black text-amber-400">{overview.lowStockCount}</div>
                <div className="text-[10px] text-amber-500/70 mt-0.5">Near threshold</div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Out of Stock</span>
                  <PackageX className="w-3.5 h-3.5 text-red-400" />
                </div>
                <div className="text-xl font-black text-red-400">{overview.outOfStockCount}</div>
                <div className="text-[10px] text-red-500/70 mt-0.5">Needs immediate restock</div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Retail Value</span>
                  <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-xl font-black text-indigo-400">
                  {currency} {overview.potentialRetailValue.toFixed(0)}
                </div>
                <div className="text-[10px] text-indigo-500/70 mt-0.5">Projected revenue</div>
              </div>
            </div>
          )}

          {/* Financial Privacy Tier (Cost & Margin) */}
          {canViewFinancials && overview && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-300">Inventory Valuation & Margin</div>
                  <div className="text-[11px] text-slate-400">
                    Authoritative purchase cost calculation (Authorized management view)
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Inventory Cost</div>
                  <div className="text-base font-black text-white">
                    {currency} {overview.inventoryCostValue?.toLocaleString()}
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Projected Margin</div>
                  <div className="text-base font-black text-emerald-400">
                    {currency} {overview.potentialGrossMargin?.toLocaleString()}
                    <span className="text-xs ml-1 text-emerald-500 font-semibold">
                      ({overview.potentialGrossMarginPercentage?.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section Navigation Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'alerts'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Stock Shortfalls & Alerts</span>
              {data && (data.outOfStockProducts.length > 0 || data.lowStockProducts.length > 0) && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/20 text-red-400 font-bold">
                  {data.outOfStockProducts.length + data.lowStockProducts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('velocity')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'velocity'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Velocity & Moving Stock</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'categories'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Category Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'suppliers'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Supplier Restock</span>
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'ledger'
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Audit Movements</span>
            </button>
          </div>

          {/* TAB CONTENT */}

          {/* Tab 1: Alerts & Shortfalls */}
          {activeTab === 'alerts' && (
            <div className="space-y-6">
              {/* Out of Stock Section */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-white">
                      Out of Stock Products ({data?.outOfStockProducts.length || 0})
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">Critical: customers cannot purchase</span>
                </div>

                {data?.outOfStockProducts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-2" />
                    <span>No out-of-stock items. Full availability!</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-2 font-semibold">Product</th>
                          <th className="pb-2 font-semibold">SKU</th>
                          <th className="pb-2 font-semibold text-center">Shortfall</th>
                          <th className="pb-2 font-semibold">Min Level</th>
                          <th className="pb-2 font-semibold">Supplier</th>
                          <th className="pb-2 font-semibold">Last Restock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {data?.outOfStockProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-900/40">
                            <td className="py-2.5 font-bold text-white">{p.name}</td>
                            <td className="py-2.5 text-slate-400 font-mono text-[11px]">{p.sku}</td>
                            <td className="py-2.5 text-center">
                              <span className="px-2 py-0.5 rounded-md font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                -{p.shortfall} units
                              </span>
                            </td>
                            <td className="py-2.5 text-slate-400">{p.minStockLevel}</td>
                            <td className="py-2.5 text-slate-300">{p.supplierName || '—'}</td>
                            <td className="py-2.5 text-slate-400 text-[11px]">
                              {p.lastRestockedAt ? `${p.lastRestockedAt} (${p.lastRestockQuantity} units)` : 'None'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Low Stock Section */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h3 className="text-sm font-bold text-white">
                      Low Stock Alerts ({data?.lowStockProducts.length || 0})
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">Shortfall to minimum safety stock</span>
                </div>

                {data?.lowStockProducts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-2" />
                    <span>All low-stock thresholds satisfied.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-2 font-semibold">Product</th>
                          <th className="pb-2 font-semibold">SKU</th>
                          <th className="pb-2 font-semibold text-center">Current Stock</th>
                          <th className="pb-2 font-semibold text-center">Shortfall</th>
                          <th className="pb-2 font-semibold">Min Level</th>
                          <th className="pb-2 font-semibold">Supplier</th>
                          <th className="pb-2 font-semibold">Last Restock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {data?.lowStockProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-900/40">
                            <td className="py-2.5 font-bold text-white">{p.name}</td>
                            <td className="py-2.5 text-slate-400 font-mono text-[11px]">{p.sku}</td>
                            <td className="py-2.5 text-center font-bold text-amber-400">{p.quantity}</td>
                            <td className="py-2.5 text-center">
                              <span className="px-2 py-0.5 rounded-md font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Need +{p.shortfall}
                              </span>
                            </td>
                            <td className="py-2.5 text-slate-400">{p.minStockLevel}</td>
                            <td className="py-2.5 text-slate-300">{p.supplierName || '—'}</td>
                            <td className="py-2.5 text-slate-400 text-[11px]">
                              {p.lastRestockedAt ? `${p.lastRestockedAt} (${p.lastRestockQuantity} units)` : 'None'}
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

          {/* Tab 2: Velocity & Moving Stock */}
          {activeTab === 'velocity' && (
            <div className="space-y-6">
              {/* Fast-Moving Products */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Fast-Moving Inventory (Velocity)</h3>
                  </div>
                  <span className="text-[11px] text-slate-500">Based on completed sales in {data?.dateRange.label}</span>
                </div>

                {(!data?.fastMovingProducts || data.fastMovingProducts.length === 0) ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No sales recorded in the selected period.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-2 font-semibold">Product</th>
                          <th className="pb-2 font-semibold">Category</th>
                          <th className="pb-2 font-semibold text-center">Units Sold</th>
                          <th className="pb-2 font-semibold text-right">Revenue</th>
                          <th className="pb-2 font-semibold text-center">Orders</th>
                          <th className="pb-2 font-semibold text-center">Current Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {data.fastMovingProducts.map((p, idx) => (
                          <tr key={p.productId} className="hover:bg-slate-900/40">
                            <td className="py-2.5 font-bold text-white flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center font-black">
                                {idx + 1}
                              </span>
                              <span>{p.productName}</span>
                            </td>
                            <td className="py-2.5 text-slate-400">{p.category}</td>
                            <td className="py-2.5 text-center font-bold text-emerald-400">
                              {p.quantitySold} units
                            </td>
                            <td className="py-2.5 text-right font-semibold text-white">
                              {currency} {p.revenue.toFixed(2)}
                            </td>
                            <td className="py-2.5 text-center text-slate-400">{p.transactionCount}</td>
                            <td className="py-2.5 text-center font-mono">{p.currentStock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Slow-Moving Products */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Slow-Moving Stock</h3>
                  </div>
                  <span className="text-[11px] text-slate-500">Items with stock on hand but low turnover</span>
                </div>

                {!data?.slowMovingProducts?.hasSufficientHistory ? (
                  <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-xl text-amber-300 text-xs flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{data?.slowMovingProducts?.message || 'Insufficient sales history for velocity analysis.'}</span>
                  </div>
                ) : data.slowMovingProducts.items.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No slow-moving products detected in this period.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-2 font-semibold">Product</th>
                          <th className="pb-2 font-semibold">Category</th>
                          <th className="pb-2 font-semibold text-center">Units Sold</th>
                          <th className="pb-2 font-semibold text-center">Current Stock</th>
                          <th className="pb-2 font-semibold text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {data.slowMovingProducts.items.map((p) => (
                          <tr key={p.productId} className="hover:bg-slate-900/40">
                            <td className="py-2.5 font-bold text-white">{p.productName}</td>
                            <td className="py-2.5 text-slate-400">{p.category}</td>
                            <td className="py-2.5 text-center font-bold text-amber-400">
                              {p.quantitySold} units
                            </td>
                            <td className="py-2.5 text-center font-mono font-bold text-slate-200">
                              {p.currentStock}
                            </td>
                            <td className="py-2.5 text-right text-slate-400">
                              {currency} {p.revenue.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Dead Stock / Never Sold */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <PackageX className="w-4 h-4 text-rose-400" />
                    <h3 className="text-sm font-bold text-white">Never-Sold Catalog Items (Dead Stock)</h3>
                  </div>
                  <span className="text-[11px] text-slate-500">All-time zero completed sales</span>
                </div>

                {(!data?.neverSoldProducts || data.neverSoldProducts.length === 0) ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    All catalog products have recorded at least one sale!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-2 font-semibold">Product</th>
                          <th className="pb-2 font-semibold">SKU</th>
                          <th className="pb-2 font-semibold">Category</th>
                          <th className="pb-2 font-semibold text-center">Unsold Stock</th>
                          <th className="pb-2 font-semibold text-right">Selling Price</th>
                          {canViewFinancials && (
                            <th className="pb-2 font-semibold text-right">Tied-Up Capital</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {data.neverSoldProducts.map((p) => (
                          <tr key={p.productId} className="hover:bg-slate-900/40">
                            <td className="py-2.5 font-bold text-white">{p.productName}</td>
                            <td className="py-2.5 text-slate-400 font-mono text-[11px]">{p.sku}</td>
                            <td className="py-2.5 text-slate-400">{p.category}</td>
                            <td className="py-2.5 text-center font-bold text-rose-400 font-mono">
                              {p.currentStock}
                            </td>
                            <td className="py-2.5 text-right font-semibold text-slate-300">
                              {currency} {p.sellingPrice.toFixed(2)}
                            </td>
                            {canViewFinancials && (
                              <td className="py-2.5 text-right font-bold text-amber-400">
                                {currency} {(p.tiedUpCapital || 0).toFixed(2)}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Category Analytics */}
          {activeTab === 'categories' && (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Category Distribution & Performance</h3>
                </div>
                <span className="text-[11px] text-slate-500">Aggregated inventory and sales</span>
              </div>

              {(!data?.categoryBreakdown || data.categoryBreakdown.length === 0) ? (
                <div className="py-6 text-center text-xs text-slate-400">No categories recorded.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-2 font-semibold">Category</th>
                        <th className="pb-2 font-semibold text-center">Products</th>
                        <th className="pb-2 font-semibold text-center">Stock Units</th>
                        <th className="pb-2 font-semibold text-center">Low/Out Stock</th>
                        <th className="pb-2 font-semibold text-center">Sales Units</th>
                        <th className="pb-2 font-semibold text-right">Revenue</th>
                        {canViewFinancials && (
                          <th className="pb-2 font-semibold text-right">Inventory Cost</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {data.categoryBreakdown.map((c) => (
                        <tr key={c.category} className="hover:bg-slate-900/40">
                          <td className="py-2.5 font-bold text-white">{c.category}</td>
                          <td className="py-2.5 text-center text-slate-300">{c.productCount}</td>
                          <td className="py-2.5 text-center font-bold text-teal-400 font-mono">
                            {c.totalStockUnits.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-center">
                            {c.lowStockCount > 0 || c.outOfStockCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-400">
                                {c.lowStockCount} low / {c.outOfStockCount} out
                              </span>
                            ) : (
                              <span className="text-emerald-400 text-[11px]">Healthy</span>
                            )}
                          </td>
                          <td className="py-2.5 text-center text-slate-300 font-semibold">{c.salesUnits}</td>
                          <td className="py-2.5 text-right font-bold text-white">
                            {currency} {c.revenue.toFixed(2)}
                          </td>
                          {canViewFinancials && (
                            <td className="py-2.5 text-right font-mono text-slate-400">
                              {currency} {(c.inventoryCost || 0).toFixed(2)}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Supplier Restock Analytics */}
          {activeTab === 'suppliers' && (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Supplier Restock Pipeline</h3>
                </div>
                <span className="text-[11px] text-slate-500">Products supplied and restock volume</span>
              </div>

              {(!data?.supplierAnalytics || data.supplierAnalytics.length === 0) ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No suppliers configured in your business.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-2 font-semibold">Supplier</th>
                        <th className="pb-2 font-semibold text-center">Assigned Products</th>
                        <th className="pb-2 font-semibold text-center">Current Stock Units</th>
                        <th className="pb-2 font-semibold text-center">Purchases Count</th>
                        <th className="pb-2 font-semibold text-center">Total Units Purchased</th>
                        <th className="pb-2 font-semibold">Last Restock Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {data.supplierAnalytics.map((s) => (
                        <tr key={s.supplierId} className="hover:bg-slate-900/40">
                          <td className="py-2.5 font-bold text-white">{s.supplierName}</td>
                          <td className="py-2.5 text-center text-slate-300">{s.productCount}</td>
                          <td className="py-2.5 text-center font-mono font-bold text-purple-400">
                            {s.totalStockUnits.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-center text-slate-400">{s.totalPurchasesCount}</td>
                          <td className="py-2.5 text-center font-semibold text-slate-200">
                            {s.totalPurchasedUnits.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-slate-400 text-[11px]">
                            {s.lastRestockDate || 'None recorded'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Recent Audit Movements */}
          {activeTab === 'ledger' && (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-teal-400" />
                  <h3 className="text-sm font-bold text-white">Recent Stock Movement Ledger</h3>
                </div>
                <span className="text-[11px] text-slate-500">Immutable audit log of all changes</span>
              </div>

              {(!data?.recentMovements || data.recentMovements.length === 0) ? (
                <div className="py-6 text-center text-xs text-slate-400">No stock movements recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-2 font-semibold">Date</th>
                        <th className="pb-2 font-semibold">Product</th>
                        <th className="pb-2 font-semibold">Type</th>
                        <th className="pb-2 font-semibold text-center">Change</th>
                        <th className="pb-2 font-semibold text-center">Stock (Old → New)</th>
                        <th className="pb-2 font-semibold">Reason / Notes</th>
                        <th className="pb-2 font-semibold">Staff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {data.recentMovements.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-900/40">
                          <td className="py-2 text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2 font-bold text-white">{m.productName}</td>
                          <td className="py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                m.movementType === 'purchase'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : m.movementType === 'sale'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {m.movementType.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 text-center font-bold">
                            <span
                              className={
                                m.quantity > 0
                                  ? 'text-emerald-400'
                                  : m.quantity < 0
                                  ? 'text-red-400'
                                  : 'text-slate-400'
                              }
                            >
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                            </span>
                          </td>
                          <td className="py-2 text-center text-slate-400 font-mono text-[11px]">
                            {m.previousQuantity} → {m.newQuantity}
                          </td>
                          <td className="py-2 text-slate-300 max-w-xs truncate">{m.notes}</td>
                          <td className="py-2 text-slate-400 text-[11px]">{m.createdBy || 'System'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Server-Authoritative Stock Engine Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
