import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  ArrowLeftRight,
  Boxes,
  TrendingUp,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Clock,
  Truck,
  ArrowRight,
  BarChart2,
  Lock,
  Edit2,
  Power,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import type {
  Business,
  Location,
  StockTransfer,
  StockTransferStatus,
  Product,
} from '../types/index.js';

interface LocationsViewProps {
  business: Business | null;
}

interface LocationSummary {
  locationId: string;
  locationName: string;
  locationCode: string;
  isDefault: boolean;
  status: string;
  totalSales: number;
  salesCount: number;
  totalProfit: number;
  totalExpenses: number;
  netProfit: number;
  inventoryUnits: number;
  inventoryValueGHS: number;
  lowStockCount: number;
  activeTransfersCount: number;
  assignedStaffCount: number;
}

export const LocationsView: React.FC<LocationsViewProps> = ({ business }) => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'transfers' | 'inventory' | 'comparison' | 'diagnostics'>('overview');

  // State
  const [locations, setLocations] = useState<Location[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [summary, setSummary] = useState<LocationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modals
  const [showNewLocationModal, setShowNewLocationModal] = useState(false);
  const [showEditLocationModal, setShowEditLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustLocationId, setAdjustLocationId] = useState<string>('');
  const [adjustQuantity, setAdjustQuantity] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Diagnostics
  const [diagnostics, setDiagnostics] = useState<any | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  // Comparison
  const [compareLocA, setCompareLocA] = useState<string>('');
  const [compareLocB, setCompareLocB] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<any | null>(null);

  // Form states
  const [newLocName, setNewLocName] = useState('');
  const [newLocCode, setNewLocCode] = useState('');
  const [newLocType, setNewLocType] = useState<'SHOP' | 'WAREHOUSE' | 'BRANCH' | 'OUTLET'>('BRANCH');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocCity, setNewLocCity] = useState('');
  const [newLocRegion, setNewLocRegion] = useState('');
  const [newLocPhone, setNewLocPhone] = useState('');
  const [newLocIsDefault, setNewLocIsDefault] = useState(false);

  // Transfer form
  const [transferSourceId, setTransferSourceId] = useState('');
  const [transferDestId, setTransferDestId] = useState('');
  const [transferProductId, setTransferProductId] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [transferNotes, setTransferNotes] = useState('');

  // Search
  const [inventorySearch, setInventorySearch] = useState('');
  const [transferFilterStatus, setTransferFilterStatus] = useState<string>('all');

  const canManage =
    user?.role === 'admin' ||
    user?.role === 'business_owner' ||
    user?.role === 'master_admin' ||
    Boolean(user?.permissions?.location_manage);

  const canTransfer =
    user?.role === 'admin' ||
    user?.role === 'business_owner' ||
    user?.role === 'master_admin' ||
    Boolean(user?.permissions?.location_transfer);

  const canAdjustInventory =
    user?.role === 'admin' ||
    user?.role === 'business_owner' ||
    user?.role === 'master_admin' ||
    Boolean(user?.permissions?.location_inventory);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load locations');
      const data = await res.json();
      setLocations(data.locations || []);
      if (!compareLocA && data.locations.length > 0) setCompareLocA(data.locations[0].id);
      if (!compareLocB && data.locations.length > 1) setCompareLocB(data.locations[1].id);
      return data.locations;
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  };

  const fetchTransfers = async () => {
    try {
      const res = await fetch('/api/transfers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load stock transfers');
      const data = await res.json();
      setTransfers(data || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(data || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchSummary = async (locId: string) => {
    try {
      const url = locId === 'all' ? '/api/locations/summary' : `/api/locations/summary?locationId=${locId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load summary');
      const data = await res.json();
      setSummary(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      const res = await fetch('/api/locations/diagnostics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  const fetchComparison = async (locA: string, locB: string) => {
    if (!locA || !locB) return;
    try {
      const res = await fetch(`/api/locations/compare?locationIdA=${locA}&locationIdB=${locB}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComparisonData(data);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchLocations(), fetchTransfers(), fetchProducts(), fetchSummary(selectedLocationId)]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [token]);

  useEffect(() => {
    fetchSummary(selectedLocationId);
  }, [selectedLocationId]);

  useEffect(() => {
    if (activeTab === 'diagnostics') {
      fetchDiagnostics();
    } else if (activeTab === 'comparison' && compareLocA && compareLocB) {
      fetchComparison(compareLocA, compareLocB);
    }
  }, [activeTab, compareLocA, compareLocB]);

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newLocName,
          code: newLocCode,
          type: newLocType,
          address: newLocAddress,
          city: newLocCity,
          region: newLocRegion,
          phone: newLocPhone,
          isDefault: newLocIsDefault,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create location');

      setActionMessage(`Branch "${data.name}" created successfully.`);
      setShowNewLocationModal(false);
      setNewLocName('');
      setNewLocCode('');
      setNewLocAddress('');
      setNewLocCity('');
      setNewLocRegion('');
      setNewLocPhone('');
      setNewLocIsDefault(false);
      await fetchLocations();
      await fetchSummary(selectedLocationId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;
    setError(null);
    try {
      const res = await fetch(`/api/locations/${editingLocation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingLocation.name,
          code: editingLocation.code,
          type: editingLocation.type,
          address: editingLocation.address,
          city: editingLocation.city,
          region: editingLocation.region,
          phone: editingLocation.phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update location');

      setActionMessage(`Branch "${data.name}" updated successfully.`);
      setShowEditLocationModal(false);
      setEditingLocation(null);
      await fetchLocations();
      await fetchSummary(selectedLocationId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleStatus = async (loc: Location) => {
    const nextStatus = loc.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/locations/${loc.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle status');

      setActionMessage(`Location "${loc.name}" set to ${nextStatus}.`);
      await fetchLocations();
      await fetchSummary(selectedLocationId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMakeDefault = async (loc: Location) => {
    try {
      const res = await fetch(`/api/locations/${loc.id}/default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set default location');

      setActionMessage(`"${loc.name}" is now the primary default location.`);
      await fetchLocations();
      await fetchSummary(selectedLocationId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceLocationId: transferSourceId,
          destinationLocationId: transferDestId,
          productId: transferProductId,
          quantity: transferQty,
          notes: transferNotes,
          idempotencyKey: `trf-client-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create transfer');

      setActionMessage(`Transfer #${data.transferNumber} created successfully.`);
      setShowTransferModal(false);
      setTransferSourceId('');
      setTransferDestId('');
      setTransferProductId('');
      setTransferQty(1);
      setTransferNotes('');
      await fetchTransfers();
      await fetchProducts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateTransferStatus = async (
    transferId: string,
    targetStatus: StockTransferStatus,
    reason?: string
  ) => {
    try {
      const res = await fetch(`/api/transfers/${transferId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: targetStatus, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update transfer status');

      setActionMessage(`Transfer #${data.transferNumber} updated to ${targetStatus}.`);
      await fetchTransfers();
      await fetchProducts();
      await fetchSummary(selectedLocationId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct || !adjustLocationId) return;
    try {
      const res = await fetch('/api/locations/stock/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: adjustProduct.id,
          locationId: adjustLocationId,
          newQuantity: adjustQuantity,
          reason: adjustReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to adjust stock');

      setActionMessage(`Stock for "${adjustProduct.name}" updated successfully.`);
      setShowAdjustStockModal(false);
      setAdjustProduct(null);
      setAdjustReason('');
      await fetchProducts();
      await fetchSummary(selectedLocationId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(inventorySearch.toLowerCase()))
  );

  const filteredTransfers = transfers.filter((t) => {
    if (transferFilterStatus !== 'all' && t.status !== transferFilterStatus) return false;
    if (selectedLocationId !== 'all') {
      return t.sourceLocationId === selectedLocationId || t.destinationLocationId === selectedLocationId;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Active Location Switcher */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-950/40">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Branches & Locations</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                  Multi-Branch Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Location isolation, cross-branch transfers, localized stock & comparative intelligence.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Location selector dropdown */}
            <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400 font-medium">Viewing:</span>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="bg-transparent text-white font-semibold outline-none cursor-pointer pr-2"
              >
                <option value="all" className="bg-slate-900 text-white">
                  All Locations (Consolidated)
                </option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id} className="bg-slate-900 text-white">
                    {loc.name} {loc.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {canManage && (
              <button
                onClick={() => setShowNewLocationModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Branch</span>
              </button>
            )}

            {canTransfer && locations.length > 1 && (
              <button
                onClick={() => {
                  if (locations.length >= 2) {
                    setTransferSourceId(locations[0].id);
                    setTransferDestId(locations[1].id);
                  }
                  if (products.length > 0) {
                    setTransferProductId(products[0].id);
                  }
                  setShowTransferModal(true);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>New Transfer</span>
              </button>
            )}
          </div>
        </div>

        {/* Action feedback message */}
        {actionMessage && (
          <div className="mt-4 p-3 bg-emerald-950/70 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-rose-950/70 border border-rose-800/60 rounded-xl flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Subtabs */}
        <div className="flex items-center space-x-2 mt-5 border-t border-slate-800/80 pt-4 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Locations & Performance</span>
          </button>

          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 ${
              activeTab === 'transfers'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Stock Transfers ({transfers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 ${
              activeTab === 'inventory'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Branch Inventory</span>
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 ${
              activeTab === 'comparison'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Branch Comparison</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 ${
              activeTab === 'diagnostics'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Integrity & Health</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: OVERVIEW & PERFORMANCE */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[11px] font-bold uppercase text-slate-400">Total Sales</span>
                <p className="text-xl font-black text-white mt-1">GH₵{summary.totalSales.toFixed(2)}</p>
                <span className="text-[11px] text-slate-400 mt-0.5 block">{summary.salesCount} orders recorded</span>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[11px] font-bold uppercase text-slate-400">Net Profit</span>
                <p className={`text-xl font-black mt-1 ${summary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  GH₵{summary.netProfit.toFixed(2)}
                </p>
                <span className="text-[11px] text-slate-400 mt-0.5 block">After GH₵{summary.totalExpenses.toFixed(2)} expenses</span>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[11px] font-bold uppercase text-slate-400">Branch Stock</span>
                <p className="text-xl font-black text-white mt-1">{summary.inventoryUnits} units</p>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Value: GH₵{summary.inventoryValueGHS.toFixed(2)}</span>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[11px] font-bold uppercase text-slate-400">Branch Health</span>
                <p className="text-xl font-black text-indigo-400 mt-1">{summary.assignedStaffCount} Staff</p>
                <span className="text-[11px] text-slate-400 mt-0.5 block">{summary.activeTransfersCount} active transfers</span>
              </div>
            </div>
          )}

          {/* Locations Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white">Registered Locations ({locations.length})</h2>
                <p className="text-xs text-slate-400">All registered branches, shops, and warehouses for your business.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((loc) => {
                const isSelected = selectedLocationId === loc.id;
                return (
                  <div
                    key={loc.id}
                    className={`p-4 rounded-2xl border transition ${
                      isSelected
                        ? 'bg-slate-800/80 border-indigo-500 shadow-md shadow-indigo-950/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{loc.name}</h3>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-slate-300">
                              {loc.code}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-slate-400">
                              {loc.type}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-1">
                        {loc.isDefault && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-400 text-[10px] font-bold">
                            Default Branch
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            loc.status === 'ACTIVE'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {loc.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3.5 space-y-1 text-xs text-slate-400">
                      {loc.address && <p className="truncate">📍 {loc.address}</p>}
                      <p>
                        🏙️ {loc.city || 'Accra'}, {loc.region || 'Ghana'}
                      </p>
                      {loc.phone && <p>📞 {loc.phone}</p>}
                    </div>

                    {/* Card Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <button
                        onClick={() => setSelectedLocationId(loc.id)}
                        className={`font-semibold hover:underline ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`}
                      >
                        {isSelected ? '✓ Currently Filtered' : 'Filter by this branch'}
                      </button>

                      {canManage && (
                        <div className="flex items-center space-x-2">
                          {!loc.isDefault && loc.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleMakeDefault(loc)}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                              title="Set as business default location"
                            >
                              Make Default
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setEditingLocation(loc);
                              setShowEditLocationModal(true);
                            }}
                            className="p-1 hover:text-white text-slate-400 transition"
                            title="Edit location"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!loc.isDefault && (
                            <button
                              onClick={() => handleToggleStatus(loc)}
                              className={`p-1 transition ${
                                loc.status === 'ACTIVE' ? 'text-rose-400 hover:text-rose-300' : 'text-emerald-400 hover:text-emerald-300'
                              }`}
                              title={loc.status === 'ACTIVE' ? 'Deactivate branch' : 'Activate branch'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: STOCK TRANSFERS */}
      {activeTab === 'transfers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">Stock Transfers ({filteredTransfers.length})</h2>
              <p className="text-xs text-slate-400">
                Track cross-branch inventory dispatches, transit verification, and receipts.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Status:</span>
              <select
                value={transferFilterStatus}
                onChange={(e) => setTransferFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-white outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="REQUESTED">Requested</option>
                <option value="APPROVED">Approved</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {filteredTransfers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
              <p>No stock transfers found matching this criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Transfer #</th>
                    <th className="p-3">Route (Source → Dest)</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Initiated By</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTransfers.map((trf) => (
                    <tr key={trf.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3 font-mono font-bold text-white">{trf.transferNumber}</td>
                      <td className="p-3">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-slate-300">{trf.sourceLocationName}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="font-semibold text-indigo-400">{trf.destinationLocationName}</span>
                        </div>
                      </td>
                      <td className="p-3 font-medium text-white">{trf.productName}</td>
                      <td className="p-3 font-bold text-white">{trf.quantity} units</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            trf.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : trf.status === 'IN_TRANSIT'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : trf.status === 'REQUESTED' || trf.status === 'APPROVED'
                              ? 'bg-blue-950 text-blue-400 border border-blue-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {trf.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {trf.requestedByName || 'Staff'}
                        <span className="block text-[10px] text-slate-500">
                          {new Date(trf.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {canTransfer && (
                          <div className="flex items-center justify-end space-x-1.5">
                            {trf.status === 'REQUESTED' && (
                              <>
                                <button
                                  onClick={() => handleUpdateTransferStatus(trf.id, 'APPROVED')}
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleUpdateTransferStatus(trf.id, 'IN_TRANSIT')}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold"
                                >
                                  Dispatch
                                </button>
                                <button
                                  onClick={() => handleUpdateTransferStatus(trf.id, 'REJECTED', 'Rejected at request')}
                                  className="px-2 py-1 bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white rounded text-[10px] font-bold"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {trf.status === 'APPROVED' && (
                              <>
                                <button
                                  onClick={() => handleUpdateTransferStatus(trf.id, 'IN_TRANSIT')}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold"
                                >
                                  Dispatch
                                </button>
                                <button
                                  onClick={() => handleUpdateTransferStatus(trf.id, 'CANCELLED', 'Cancelled by user')}
                                  className="px-2 py-1 bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white rounded text-[10px] font-bold"
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {trf.status === 'IN_TRANSIT' && (
                              <>
                                <button
                                  onClick={() => handleUpdateTransferStatus(trf.id, 'COMPLETED')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold shadow"
                                >
                                  Receive & Complete
                                </button>
                                <button
                                  onClick={() => handleUpdateTransferStatus(trf.id, 'REJECTED', 'Damaged or refused on delivery')}
                                  className="px-2 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded text-[10px] font-bold"
                                >
                                  Return
                                </button>
                              </>
                            )}

                            {(trf.status === 'COMPLETED' || trf.status === 'CANCELLED' || trf.status === 'REJECTED') && (
                              <span className="text-[10px] text-slate-500 italic">Archived</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: MULTI-LOCATION INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">Branch Inventory Matrix</h2>
              <p className="text-xs text-slate-400">
                Track how much stock exists at each branch for every product.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search products..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Total Units</th>
                  {locations.map((loc) => (
                    <th key={loc.id} className="p-3 font-medium">
                      {loc.name} {loc.isDefault ? '(Main)' : ''}
                    </th>
                  ))}
                  {canAdjustInventory && <th className="p-3 text-right">Adjust Stock</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProducts.map((prod) => {
                  const defLoc = locations.find((l) => l.isDefault) || locations[0];
                  return (
                    <tr key={prod.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3 font-semibold text-white">{prod.name}</td>
                      <td className="p-3 font-mono text-slate-400">{prod.sku || '-'}</td>
                      <td className="p-3 font-bold text-indigo-400">{prod.quantity} units</td>
                      {locations.map((loc) => {
                        let locQty = 0;
                        if (prod.locationStock && typeof prod.locationStock[loc.id] === 'number') {
                          locQty = prod.locationStock[loc.id];
                        } else if (loc.id === defLoc?.id) {
                          locQty = prod.quantity;
                        }
                        return (
                          <td key={loc.id} className="p-3 font-mono">
                            <span
                              className={
                                locQty <= (prod.minStockLevel || 0)
                                  ? 'text-rose-400 font-bold'
                                  : 'text-slate-200'
                              }
                            >
                              {locQty}
                            </span>
                          </td>
                        );
                      })}
                      {canAdjustInventory && (
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setAdjustProduct(prod);
                              setAdjustLocationId(locations[0]?.id || '');
                              setAdjustQuantity(prod.quantity);
                              setShowAdjustStockModal(true);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded text-[10px] font-bold"
                          >
                            Adjust
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: BRANCH COMPARISON */}
      {activeTab === 'comparison' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div>
            <h2 className="text-base font-bold text-white">Side-by-Side Branch Comparison</h2>
            <p className="text-xs text-slate-400">
              Benchmark operational efficiency, sales volume, and expenses between two branches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
              <label className="text-xs font-semibold text-slate-400 block mb-1">Branch A:</label>
              <select
                value={compareLocA}
                onChange={(e) => setCompareLocA(e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white outline-none"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
              <label className="text-xs font-semibold text-slate-400 block mb-1">Branch B:</label>
              <select
                value={compareLocB}
                onChange={(e) => setCompareLocB(e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white outline-none"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {comparisonData && (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs text-left border border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Metric</th>
                    <th className="p-3.5 text-indigo-400">{comparisonData.locationA.locationName}</th>
                    <th className="p-3.5 text-emerald-400">{comparisonData.locationB.locationName}</th>
                    <th className="p-3.5 text-right">Difference (A - B)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr>
                    <td className="p-3 font-semibold text-slate-300">Total Sales</td>
                    <td className="p-3 font-bold text-white">GH₵{comparisonData.locationA.totalSales.toFixed(2)}</td>
                    <td className="p-3 font-bold text-white">GH₵{comparisonData.locationB.totalSales.toFixed(2)}</td>
                    <td className="p-3 font-mono text-right font-bold">
                      {comparisonData.differences.salesDiffGHS >= 0 ? '+' : ''}
                      GH₵{comparisonData.differences.salesDiffGHS.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-300">Sales Transactions</td>
                    <td className="p-3 text-white">{comparisonData.locationA.salesCount}</td>
                    <td className="p-3 text-white">{comparisonData.locationB.salesCount}</td>
                    <td className="p-3 font-mono text-right font-bold">
                      {comparisonData.differences.salesCountDiff >= 0 ? '+' : ''}
                      {comparisonData.differences.salesCountDiff}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-300">Total Expenses</td>
                    <td className="p-3 text-white">GH₵{comparisonData.locationA.totalExpenses.toFixed(2)}</td>
                    <td className="p-3 text-white">GH₵{comparisonData.locationB.totalExpenses.toFixed(2)}</td>
                    <td className="p-3 font-mono text-right font-bold">
                      {comparisonData.differences.expensesDiffGHS >= 0 ? '+' : ''}
                      GH₵{comparisonData.differences.expensesDiffGHS.toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-slate-950/40">
                    <td className="p-3 font-bold text-white">Net Profit</td>
                    <td className="p-3 font-black text-emerald-400">
                      GH₵{comparisonData.locationA.netProfit.toFixed(2)}
                    </td>
                    <td className="p-3 font-black text-emerald-400">
                      GH₵{comparisonData.locationB.netProfit.toFixed(2)}
                    </td>
                    <td className="p-3 font-mono text-right font-black">
                      {comparisonData.differences.netProfitDiffGHS >= 0 ? '+' : ''}
                      GH₵{comparisonData.differences.netProfitDiffGHS.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-300">Inventory Units</td>
                    <td className="p-3 text-white">{comparisonData.locationA.inventoryUnits}</td>
                    <td className="p-3 text-white">{comparisonData.locationB.inventoryUnits}</td>
                    <td className="p-3 font-mono text-right font-bold">
                      {comparisonData.differences.inventoryUnitsDiff >= 0 ? '+' : ''}
                      {comparisonData.differences.inventoryUnitsDiff} units
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 5: SYSTEM HEALTH & INTEGRITY */}
      {activeTab === 'diagnostics' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Multi-Location Integrity Diagnostics</h2>
              <p className="text-xs text-slate-400">
                Automated consistency checks for branch codes, stock reconciliation, and staff boundaries.
              </p>
            </div>
            <button
              onClick={fetchDiagnostics}
              disabled={loadingDiagnostics}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-xl transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDiagnostics ? 'animate-spin' : ''}`} />
              <span>Re-run Checks</span>
            </button>
          </div>

          {diagnostics && (
            <div className="space-y-4 mt-2">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      diagnostics.healthy ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Overall Health: {diagnostics.healthy ? 'Compliant & Healthy' : 'Action Needed'}
                    </h3>
                    <p className="text-xs text-slate-400">Integrity Score: {diagnostics.score}%</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    diagnostics.healthy ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {diagnostics.healthy ? '100% SECURE' : 'WARNINGS FOUND'}
                </span>
              </div>

              <div className="space-y-2">
                {diagnostics.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start space-x-3 text-xs"
                  >
                    {item.severity === 'HEALTHY' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : item.severity === 'WARNING' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <span className="font-bold text-white uppercase tracking-wider text-[10px] block text-slate-400">
                        {item.category}
                      </span>
                      <p className="text-slate-200 mt-0.5">{item.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: NEW LOCATION */}
      {showNewLocationModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Create New Branch Location</h3>
              <button onClick={() => setShowNewLocationModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Osu Branch"
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Branch Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., OSU"
                    value={newLocCode}
                    onChange={(e) => setNewLocCode(e.target.value.toUpperCase())}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono uppercase outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">Type</label>
                  <select
                    value={newLocType}
                    onChange={(e: any) => setNewLocType(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  >
                    <option value="BRANCH">Branch</option>
                    <option value="SHOP">Shop</option>
                    <option value="WAREHOUSE">Warehouse</option>
                    <option value="OUTLET">Outlet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="e.g., Oxford Street, Osu"
                  value={newLocAddress}
                  onChange={(e) => setNewLocAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium block mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g., Accra"
                    value={newLocCity}
                    onChange={(e) => setNewLocCity(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g., 0244123456"
                    value={newLocPhone}
                    onChange={(e) => setNewLocPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition"
                >
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STOCK TRANSFER */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Create Stock Transfer</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Source Location *</label>
                  <select
                    required
                    value={transferSourceId}
                    onChange={(e) => setTransferSourceId(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">Destination Location *</label>
                  <select
                    required
                    value={transferDestId}
                    onChange={(e) => setTransferDestId(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                  >
                    {locations
                      .filter((l) => l.id !== transferSourceId)
                      .map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Product *</label>
                <select
                  required
                  value={transferProductId}
                  onChange={(e) => setTransferProductId(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Total available: {p.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Quantity to Transfer *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Transfer Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Weekly stock replenishment dispatch"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition"
                >
                  Submit Stock Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADJUST STOCK */}
      {showAdjustStockModal && adjustProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Adjust Branch Stock: {adjustProduct.name}</h3>
              <button onClick={() => setShowAdjustStockModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Target Location *</label>
                <select
                  value={adjustLocationId}
                  onChange={(e) => setAdjustLocationId(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">New Physical Count *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Adjustment Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Physical stock count audit discrepancy"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
