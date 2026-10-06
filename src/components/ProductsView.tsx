import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  X,
  DollarSign,
  Filter,
  History,
  SlidersHorizontal,
  ArrowUpDown,
  Download,
  RefreshCw,
  PackageCheck,
  PackageX,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
  Info,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api.js';
import type { Product, Supplier, Business, StockMovement, StockMovementType } from '../types/index.js';
import { InventoryIntelligenceModal } from './InventoryIntelligenceModal.js';

interface ProductsViewProps {
  business: Business | null;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ business }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'normal' | 'low' | 'out'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock_asc' | 'stock_desc' | 'price_desc' | 'profit_desc'>('name');

  // Inventory Intelligence Modal
  const [intelligenceModalOpen, setIntelligenceModalOpen] = useState(false);

  // Product Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [buyingPrice, setBuyingPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [minStockLevel, setMinStockLevel] = useState<string>('5');
  const [supplierId, setSupplierId] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Stock Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustMode, setAdjustMode] = useState<'add' | 'remove' | 'set'>('add');
  const [adjustQty, setAdjustQty] = useState<string>('1');
  const [adjustReason, setAdjustReason] = useState<string>('Restock / Received delivery');
  const [adjustNotes, setAdjustNotes] = useState<string>('');
  const [adjusting, setAdjusting] = useState(false);

  // Stock Movements / History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Low Stock Banner Dismiss state
  const [dismissLowStockBanner, setDismissLowStockBanner] = useState(false);

  const currency = business?.currency || 'GH₵';

  const loadData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const [prods, sups] = await Promise.all([
        api.getProducts(),
        api.getSuppliers(),
      ]);
      setProducts(prods);
      setSuppliers(sups);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick category list
  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [products]);

  const categories = ['All', ...existingCategories];

  // Calculations for Form
  const calcBuy = Math.max(0, Number(buyingPrice) || 0);
  const calcSell = Math.max(0, Number(sellingPrice) || 0);
  const calcUnitProfit = calcSell - calcBuy;
  const calcMargin = calcSell > 0 ? ((calcUnitProfit / calcSell) * 100).toFixed(1) : '0';

  const generateRandomSku = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    setSku(`SKU-${randomNum}`);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    generateRandomSku();
    setCategory('General');
    setNewCategoryInput('');
    setBuyingPrice('');
    setSellingPrice('');
    setQuantity('10');
    setMinStockLevel('5');
    setSupplierId('');
    setDescription('');
    setImageUrl('');
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setCategory(p.category || 'General');
    setNewCategoryInput('');
    setBuyingPrice(p.buyingPrice.toString());
    setSellingPrice(p.sellingPrice.toString());
    setQuantity(p.quantity.toString());
    setMinStockLevel(p.minStockLevel.toString());
    setSupplierId(p.supplierId || '');
    setDescription(p.description || '');
    setImageUrl(p.imageUrl || '');
    setError('');
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    const buy = Number(buyingPrice);
    const sell = Number(sellingPrice);
    const qty = Number(quantity);
    const minStock = Number(minStockLevel);

    if (isNaN(buy) || buy < 0 || isNaN(sell) || sell < 0) {
      setError('Buying and selling prices must be valid non-negative numbers.');
      return;
    }

    if (isNaN(qty) || qty < 0) {
      setError('Stock quantity cannot be negative.');
      return;
    }

    if (isNaN(minStock) || minStock < 0) {
      setError('Minimum stock alert level cannot be negative.');
      return;
    }

    const finalCategory =
      category === '__new__'
        ? newCategoryInput.trim() || 'General'
        : category.trim() || 'General';

    try {
      setSubmitting(true);
      setError('');

      const selectedSupplier = suppliers.find((s) => s.id === supplierId);

      const payload = {
        name: name.trim(),
        sku: (sku || `SKU-${Date.now().toString().slice(-6)}`).toUpperCase().trim(),
        category: finalCategory,
        buyingPrice: buy,
        sellingPrice: sell,
        quantity: Math.round(qty),
        minStockLevel: Math.round(minStock),
        supplierId: supplierId || undefined,
        supplierName: selectedSupplier?.name,
        description: description.trim(),
        imageUrl: imageUrl.trim(),
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
        showSuccessBanner(`Product "${payload.name}" updated successfully.`);
      } else {
        await api.addProduct(payload);
        showSuccessBanner(`Product "${payload.name}" added to inventory.`);
      }

      await loadData();
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  const showSuccessBanner = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage('');
    }, 4000);
  };

  // Stock Adjustment Flow
  const openAdjustModal = (p: Product) => {
    setAdjustProduct(p);
    setAdjustMode('add');
    setAdjustQty('1');
    setAdjustReason('Restock / Received delivery');
    setAdjustNotes('');
    setAdjustModalOpen(true);
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;

    const val = Number(adjustQty);
    if (isNaN(val) || val < 0) {
      setError('Please enter a valid non-negative number.');
      return;
    }

    let newTotal = adjustProduct.quantity;
    if (adjustMode === 'add') {
      newTotal = adjustProduct.quantity + val;
    } else if (adjustMode === 'remove') {
      newTotal = Math.max(0, adjustProduct.quantity - val);
    } else if (adjustMode === 'set') {
      newTotal = Math.round(val);
    }

    const fullReason = adjustNotes.trim()
      ? `${adjustReason}: ${adjustNotes.trim()}`
      : adjustReason;

    try {
      setAdjusting(true);
      setError('');
      await api.adjustProductStock(adjustProduct.id, {
        newTotalQuantity: newTotal,
        reason: fullReason,
        adjustmentType: adjustMode,
      });

      showSuccessBanner(
        `Stock for "${adjustProduct.name}" adjusted to ${newTotal} units.`
      );
      setAdjustModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock.');
    } finally {
      setAdjusting(false);
    }
  };

  // Stock History Flow
  const openHistoryModal = async (p?: Product) => {
    setHistoryProduct(p || null);
    setHistoryModalOpen(true);
    try {
      setLoadingMovements(true);
      if (p) {
        const data = await api.getProductMovements(p.id);
        setMovements(data);
      } else {
        const data = await api.getStockMovements();
        setMovements(data);
      }
    } catch (err: any) {
      console.error('Failed to load stock movements:', err);
    } finally {
      setLoadingMovements(false);
    }
  };

  // Delete Flow
  const promptDelete = (p: Product) => {
    setProductToDelete(p);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      setDeleting(true);
      await api.deleteProduct(productToDelete.id);
      showSuccessBanner(`Product "${productToDelete.name}" deleted.`);
      setDeleteModalOpen(false);
      setProductToDelete(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete product.');
    } finally {
      setDeleting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (products.length === 0) return;
    const headers = [
      'Product Name',
      'SKU',
      'Category',
      'Buying Price (GH₵)',
      'Selling Price (GH₵)',
      'Profit Per Unit (GH₵)',
      'Margin (%)',
      'Stock Quantity',
      'Min Stock Level',
      'Stock Status',
      'Supplier',
    ];

    const rows = products.map((p) => {
      const profit = (p.sellingPrice - p.buyingPrice).toFixed(2);
      const margin =
        p.sellingPrice > 0
          ? (((p.sellingPrice - p.buyingPrice) / p.sellingPrice) * 100).toFixed(1)
          : '0';
      const status =
        p.quantity === 0
          ? 'OUT OF STOCK'
          : p.quantity <= p.minStockLevel
          ? 'LOW STOCK'
          : 'IN STOCK';

      return [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.sku}"`,
        `"${p.category || 'General'}"`,
        p.buyingPrice.toFixed(2),
        p.sellingPrice.toFixed(2),
        profit,
        `${margin}%`,
        p.quantity,
        p.minStockLevel,
        status,
        `"${(p.supplierName || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `inventory_report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Inventory Summary Stats
  const stats = useMemo(() => {
    let totalItems = 0;
    let totalInventoryCost = 0;
    let totalPotentialRevenue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      const qty = p.quantity || 0;
      totalItems += qty;
      totalInventoryCost += qty * (p.buyingPrice || 0);
      totalPotentialRevenue += qty * (p.sellingPrice || 0);

      if (qty === 0) {
        outOfStockCount++;
      } else if (qty <= (p.minStockLevel || 5)) {
        lowStockCount++;
      }
    }

    const totalPotentialProfit = totalPotentialRevenue - totalInventoryCost;

    return {
      productCount: products.length,
      totalItems,
      totalInventoryCost,
      totalPotentialRevenue,
      totalPotentialProfit,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.supplierName && p.supplierName.toLowerCase().includes(q));

        const matchesCategory =
          categoryFilter === 'All' ||
          (p.category || 'General').toLowerCase() === categoryFilter.toLowerCase();

        let matchesStock = true;
        if (stockFilter === 'out') {
          matchesStock = p.quantity === 0;
        } else if (stockFilter === 'low') {
          matchesStock = p.quantity > 0 && p.quantity <= p.minStockLevel;
        } else if (stockFilter === 'normal') {
          matchesStock = p.quantity > p.minStockLevel;
        }

        return matchesSearch && matchesCategory && matchesStock;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'stock_asc') return a.quantity - b.quantity;
        if (sortBy === 'stock_desc') return b.quantity - a.quantity;
        if (sortBy === 'price_desc') return b.sellingPrice - a.sellingPrice;
        if (sortBy === 'profit_desc') {
          const profitA = a.sellingPrice - a.buyingPrice;
          const profitB = b.sellingPrice - b.buyingPrice;
          return profitB - profitA;
        }
        return 0;
      });
  }, [products, searchQuery, categoryFilter, stockFilter, sortBy]);

  const lowOrOutStockProducts = useMemo(() => {
    return products.filter((p) => p.quantity <= (p.minStockLevel || 5));
  }, [products]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Product Inventory & Pricing
              </h1>
              <p className="text-xs text-slate-400">
                Manage product catalog, track stock quantities, and monitor profit margins
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIntelligenceModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition shadow-sm"
            title="Open Inventory Intelligence Analytics"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Stock Intelligence</span>
          </button>

          <button
            onClick={() => openHistoryModal()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition"
            title="View All Stock Movement Ledger"
          >
            <History className="w-3.5 h-3.5 text-teal-400" />
            <span>Stock Ledger</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={products.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition disabled:opacity-40"
            title="Download CSV Inventory Report"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
            title="Refresh Products"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Notifications / Feedback */}
      {successMessage && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800/80 rounded-2xl text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="p-1 hover:text-white text-emerald-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/70 border border-red-800/80 rounded-2xl text-red-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:text-white text-red-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Low / Out of Stock Banner Alert */}
      {!dismissLowStockBanner && lowOrOutStockProducts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-300">
                Inventory Warning: {lowOrOutStockProducts.length}{' '}
                {lowOrOutStockProducts.length === 1 ? 'product needs' : 'products need'} attention
              </p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                {stats.outOfStockCount > 0 && (
                  <span className="font-semibold text-rose-300 mr-2">
                    {stats.outOfStockCount} Out of Stock
                  </span>
                )}
                {stats.lowStockCount > 0 && (
                  <span className="font-semibold text-amber-300">
                    {stats.lowStockCount} Low Stock
                  </span>
                )}
                {' — '}
                {lowOrOutStockProducts
                  .slice(0, 3)
                  .map((p) => p.name)
                  .join(', ')}
                {lowOrOutStockProducts.length > 3 ? ` and ${lowOrOutStockProducts.length - 3} more` : ''}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => {
                setStockFilter('low');
                setSearchQuery('');
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-xs transition border border-amber-500/40"
            >
              Filter Low Stock
            </button>
            <button
              onClick={() => setDismissLowStockBanner(true)}
              className="p-1.5 text-amber-400 hover:text-amber-200"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Inventory Summary Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Total Products */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Total Catalog</span>
            <Boxes className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-white">{stats.productCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{stats.totalItems} total stock units</p>
        </div>

        {/* Inventory Cost Value */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Inventory Cost</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-black text-white font-mono">
            {currency} {stats.totalInventoryCost.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">At buying cost</p>
        </div>

        {/* Potential Retail Value */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">Retail Value</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-xl font-black text-white font-mono">
            {currency} {stats.totalPotentialRevenue.toFixed(2)}
          </p>
          <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
            +{currency} {stats.totalPotentialProfit.toFixed(2)} potential profit
          </p>
        </div>

        {/* Low Stock Filter Card */}
        <div
          onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            stockFilter === 'low'
              ? 'bg-amber-950/60 border-amber-700/80'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold text-amber-300">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-300">{stats.lowStockCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {stockFilter === 'low' ? 'Filtering active (Click to reset)' : 'Click to filter'}
          </p>
        </div>

        {/* Out of Stock Filter Card */}
        <div
          onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
          className={`p-4 rounded-2xl border cursor-pointer transition col-span-2 sm:col-span-1 ${
            stockFilter === 'out'
              ? 'bg-rose-950/60 border-rose-700/80'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold text-rose-300">Out of Stock</span>
            <PackageX className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-black text-rose-300">{stats.outOfStockCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {stockFilter === 'out' ? 'Filtering active (Click to reset)' : 'Click to filter'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        {/* Search */}
        <div className="relative md:col-span-4 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name, SKU, category, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category dropdown */}
        <div className="md:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>
        </div>

        {/* Stock status filter */}
        <div className="md:col-span-3">
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all">All Stock Statuses</option>
            <option value="normal">Normal Stock (Healthy)</option>
            <option value="low">Low Stock Only</option>
            <option value="out">Out of Stock Only</option>
          </select>
        </div>

        {/* Sort By dropdown */}
        <div className="md:col-span-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
          >
            <option value="name">Sort: Name (A-Z)</option>
            <option value="stock_asc">Sort: Stock (Lowest)</option>
            <option value="stock_desc">Sort: Stock (Highest)</option>
            <option value="price_desc">Sort: Price (High-Low)</option>
            <option value="profit_desc">Sort: Profit (High-Low)</option>
          </select>
        </div>
      </div>

      {/* Products Table & Grid */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-white">Products List</h3>
            {(categoryFilter !== 'All' || stockFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setCategoryFilter('All');
                  setStockFilter('all');
                  setSearchQuery('');
                }}
                className="text-[10px] text-emerald-400 hover:underline font-semibold"
              >
                Reset filters
              </button>
            )}
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredProducts.length} of {products.length}{' '}
            {filteredProducts.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-500" />
            <p className="text-xs">Loading product inventory...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-2">Product / SKU</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Buying Price</th>
                    <th className="pb-3">Selling Price</th>
                    <th className="pb-3">Profit / Margin</th>
                    <th className="pb-3">Stock Level</th>
                    <th className="pb-3">Supplier</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredProducts.map((p) => {
                    const profitPerUnit = p.sellingPrice - p.buyingPrice;
                    const marginPercent =
                      p.sellingPrice > 0
                        ? ((profitPerUnit / p.sellingPrice) * 100).toFixed(1)
                        : '0';
                    const isOutOfStock = p.quantity === 0;
                    const isLowStock = p.quantity > 0 && p.quantity <= p.minStockLevel;

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition group">
                        <td className="py-3.5 pl-2">
                          <div className="flex items-center space-x-3">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-9 h-9 rounded-xl object-cover bg-slate-800 border border-slate-700 shrink-0"
                                onError={(e) => {
                                  // Fallback on broken image
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center font-black text-xs shrink-0">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-slate-100 truncate max-w-[180px]">
                                {p.name}
                              </p>
                              <span className="text-[10px] text-slate-500 font-mono tracking-tight">
                                {p.sku}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-medium">
                            {p.category || 'General'}
                          </span>
                        </td>

                        <td className="py-3.5 text-slate-400 font-mono">
                          {currency} {p.buyingPrice.toFixed(2)}
                        </td>

                        <td className="py-3.5 font-bold text-white font-mono">
                          {currency} {p.sellingPrice.toFixed(2)}
                        </td>

                        <td className="py-3.5">
                          <div className="font-mono">
                            <span
                              className={`font-bold ${
                                profitPerUnit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {profitPerUnit >= 0 ? '+' : ''}
                              {currency} {profitPerUnit.toFixed(2)}
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              {marginPercent}% margin
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5">
                          <div>
                            <span
                              className={`font-bold text-sm ${
                                isOutOfStock
                                  ? 'text-rose-400'
                                  : isLowStock
                                  ? 'text-amber-400'
                                  : 'text-slate-200'
                              }`}
                            >
                              {p.quantity} units
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              Min Alert: {p.minStockLevel}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 text-slate-400 text-[11px] truncate max-w-[120px]">
                          {p.supplierName || '—'}
                        </td>

                        <td className="py-3.5">
                          {isOutOfStock ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-950/80 text-rose-300 border border-rose-800/80 tracking-wide">
                                <PackageX className="w-3 h-3" />
                                OUT OF STOCK
                              </span>
                              {p.shortfall !== undefined && p.shortfall > 0 && (
                                <span className="block text-[10px] font-bold text-rose-400 font-mono mt-0.5">
                                  Shortfall: -{p.shortfall}
                                </span>
                              )}
                            </div>
                          ) : isLowStock ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-950/80 text-amber-300 border border-amber-800/80 tracking-wide">
                                <AlertTriangle className="w-3 h-3" />
                                LOW STOCK
                              </span>
                              {p.shortfall !== undefined && p.shortfall > 0 && (
                                <span className="block text-[10px] font-bold text-amber-400 font-mono mt-0.5">
                                  Need +{p.shortfall}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 tracking-wide">
                              <PackageCheck className="w-3 h-3" />
                              IN STOCK
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 pr-2 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => openAdjustModal(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                              title="Quick Stock Adjust (+ / -)"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openHistoryModal(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition"
                              title="Stock History Ledger"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                              title="Edit Product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => promptDelete(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                              title="Delete Product"
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

            {/* Mobile & Tablet Responsive Cards */}
            <div className="lg:hidden space-y-3">
              {filteredProducts.map((p) => {
                const profitPerUnit = p.sellingPrice - p.buyingPrice;
                const marginPercent =
                  p.sellingPrice > 0
                    ? ((profitPerUnit / p.sellingPrice) * 100).toFixed(1)
                    : '0';
                const isOutOfStock = p.quantity === 0;
                const isLowStock = p.quantity > 0 && p.quantity <= p.minStockLevel;

                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-11 h-11 rounded-xl object-cover bg-slate-800 border border-slate-700 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center font-black text-sm shrink-0">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-bold text-white">{p.name}</h4>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                              {p.category || 'General'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stock Status Badge */}
                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-950 text-rose-300 border border-rose-800">
                          OUT OF STOCK
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-950 text-amber-300 border border-amber-800">
                          LOW STOCK
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800">
                          IN STOCK
                        </span>
                      )}
                    </div>

                    {/* Pricing & Stock Details */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Buy / Sell</span>
                        <span className="font-mono text-slate-300 font-semibold text-[11px]">
                          {currency} {p.buyingPrice.toFixed(0)} / {currency}{' '}
                          {p.sellingPrice.toFixed(0)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block">Profit / Unit</span>
                        <span className="font-mono text-emerald-400 font-bold text-[11px]">
                          +{currency} {profitPerUnit.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-slate-500 block">({marginPercent}%)</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block">Current Stock</span>
                        <span
                          className={`font-bold font-mono text-[11px] ${
                            isOutOfStock
                              ? 'text-rose-400'
                              : isLowStock
                              ? 'text-amber-400'
                              : 'text-white'
                          }`}
                        >
                          {p.quantity} units
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          Min: {p.minStockLevel}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                        {p.supplierName ? `Sup: ${p.supplierName}` : 'No supplier'}
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => openAdjustModal(p)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-400 hover:bg-slate-700 text-xs font-semibold flex items-center space-x-1"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          <span>Adjust</span>
                        </button>
                        <button
                          onClick={() => openHistoryModal(p)}
                          className="p-1.5 rounded-lg bg-slate-800 text-teal-300 hover:bg-slate-700"
                          title="Stock History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => promptDelete(p)}
                          className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-slate-700"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <Boxes className="w-12 h-12 mx-auto text-slate-600" />
            <h4 className="text-sm font-bold text-slate-300">No products found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || categoryFilter !== 'All' || stockFilter !== 'all'
                ? 'No products matched your search or filters. Try clearing filters to see all inventory items.'
                : 'Add your first product to start tracking your inventory, stock movements, and profit margins.'}
            </p>
            {searchQuery || categoryFilter !== 'All' || stockFilter !== 'all' ? (
              <button
                onClick={() => {
                  setCategoryFilter('All');
                  setStockFilter('all');
                  setSearchQuery('');
                }}
                className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
              >
                Clear Search & Filters
              </button>
            ) : (
              <button
                onClick={openAddModal}
                className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                + ADD PRODUCT
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================
          ADD / EDIT PRODUCT MODAL
      ======================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Boxes className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Milo 400g Tin / Zara Floral Dress"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* SKU & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      SKU / Barcode
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomSku}
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      Auto-generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="SKU-1001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="General">General</option>
                    {existingCategories
                      .filter((c) => c !== 'General')
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    <option value="__new__">+ Create New Category...</option>
                  </select>
                </div>
              </div>

              {/* Custom New Category Input if selected */}
              {category === '__new__' && (
                <div>
                  <label className="block text-xs font-semibold text-emerald-400 mb-1">
                    Enter New Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    placeholder="e.g. Cosmetics / Beverages / Electronics"
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Pricing & Realtime Margin Calculation */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Pricing & Profit Margins
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Currency: {currency}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Buying Price ({currency}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={buyingPrice}
                      onChange={(e) => setBuyingPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Selling Price ({currency}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Auto Calculated Profit per unit Box */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Profit Per Unit</span>
                    <p className="text-[10px] text-slate-500">Selling Price - Buying Price</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-black font-mono ${
                        calcUnitProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {calcUnitProfit >= 0 ? '+' : ''}
                      {currency} {calcUnitProfit.toFixed(2)}
                    </span>
                    <p className="text-[10px] text-teal-400 font-bold">Margin: {calcMargin}%</p>
                  </div>
                </div>
              </div>

              {/* Stock Quantities */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Current Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="10"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Physical items on shelf</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Min Stock Alert Level *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(e.target.value)}
                    placeholder="5"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Triggers low stock alert</p>
                </div>
              </div>

              {/* Supplier Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Supplier (Optional)
                  </label>
                  {suppliers.length === 0 && (
                    <span className="text-[10px] text-slate-500">No suppliers registered yet</span>
                  )}
                </div>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="">-- No Assigned Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone || s.category || 'Supplier'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Image URL with Preview */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product Image URL (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or direct image link"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                  />
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-8 h-8 rounded-lg object-cover bg-slate-800 border border-slate-700"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Details (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Size, color, brand, batch number, or special storage notes..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-md disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingProduct ? 'Update Product' : 'Add Product'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          QUICK STOCK ADJUSTMENT MODAL
      ======================================================== */}
      {adjustModalOpen && adjustProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Adjust Stock Level</h3>
                  <p className="text-[10px] text-slate-400 truncate max-w-[220px]">
                    {adjustProduct.name} ({adjustProduct.sku})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="p-5 space-y-4">
              {/* Current Quantity Display */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400">Current Stock in System</span>
                  <p className="text-lg font-black text-white">{adjustProduct.quantity} units</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400">Alert Threshold</span>
                  <p className="text-xs text-amber-400 font-mono">{adjustProduct.minStockLevel} units</p>
                </div>
              </div>

              {/* Adjustment Mode Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustMode('add')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      adjustMode === 'add'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    + Add Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustMode('remove')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      adjustMode === 'remove'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    - Deduct Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustMode('set')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      adjustMode === 'set'
                        ? 'bg-teal-600 text-white border-teal-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    = Set Exact
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {adjustMode === 'add'
                    ? 'Quantity to Add (+)'
                    : adjustMode === 'remove'
                    ? 'Quantity to Deduct (-)'
                    : 'New Total Quantity (=)'}
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-emerald-500 font-mono font-bold"
                />
              </div>

              {/* Result Preview */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-400">Resulting Stock Level:</span>
                <span className="font-bold text-white font-mono text-sm">
                  {adjustMode === 'add'
                    ? `${adjustProduct.quantity + (Number(adjustQty) || 0)} units`
                    : adjustMode === 'remove'
                    ? `${Math.max(0, adjustProduct.quantity - (Number(adjustQty) || 0))} units`
                    : `${Number(adjustQty) || 0} units`}
                </span>
              </div>

              {/* Reason Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Adjustment *
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="Restock / Received delivery">Restock / Received delivery</option>
                  <option value="Physical count audit discrepancy">Physical count audit discrepancy</option>
                  <option value="Damaged / Broken goods">Damaged / Broken goods</option>
                  <option value="Expired items removal">Expired items removal</option>
                  <option value="Customer return / restock">Customer return / restock</option>
                  <option value="Internal business use">Internal business use</option>
                  <option value="Correction of clerical error">Correction of clerical error</option>
                </select>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Audit by Store Manager"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-md disabled:opacity-50"
                >
                  {adjusting ? 'Saving Adjustment...' : 'Apply Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          STOCK MOVEMENT / AUDIT LEDGER MODAL
      ======================================================== */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {historyProduct ? `Stock History: ${historyProduct.name}` : 'Business Stock Movements'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {historyProduct
                      ? `SKU: ${historyProduct.sku} • Current Stock: ${historyProduct.quantity} units`
                      : 'Audit log of all additions, sales, purchases, and adjustments'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[65vh] overflow-y-auto space-y-3">
              {loadingMovements ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <RefreshCw className="w-6 h-6 mx-auto animate-spin text-teal-400" />
                  <p className="text-xs">Loading ledger entries...</p>
                </div>
              ) : movements.length > 0 ? (
                <div className="space-y-2">
                  {movements.map((m) => {
                    const isPositive = m.quantity > 0;
                    const dateStr = new Date(m.createdAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={m.id}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold ${
                              isPositive
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                                : 'bg-rose-950 text-rose-400 border border-rose-800/80'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center space-x-2">
                              {!historyProduct && m.productName && (
                                <span className="font-bold text-white truncate max-w-[150px]">
                                  {m.productName}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-semibold uppercase">
                                {m.movementType}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {m.notes || 'Stock modification'}
                            </p>
                            <span className="text-[10px] text-slate-500 font-mono">{dateStr}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-mono font-bold text-sm ${
                              isPositive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isPositive ? `+${m.quantity}` : m.quantity}
                          </span>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {m.previousQuantity} → {m.newQuantity} units
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <History className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-xs font-semibold text-slate-300">No stock movements recorded yet</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Movements are logged automatically when sales, purchases, or adjustments occur.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DELETE CONFIRMATION MODAL
      ======================================================== */}
      {deleteModalOpen && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Delete Product?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove <span className="text-white font-bold">"{productToDelete.name}"</span>?
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Past sales records referencing this product will be preserved safely.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Intelligence & Stock Control Modal */}
      <InventoryIntelligenceModal
        isOpen={intelligenceModalOpen}
        onClose={() => setIntelligenceModalOpen(false)}
        business={business}
        onSelectProductForAdjustment={(p) => {
          setIntelligenceModalOpen(false);
          openAdjustModal(p);
        }}
      />
    </div>
  );
};
