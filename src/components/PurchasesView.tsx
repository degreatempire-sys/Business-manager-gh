import React, { useState, useEffect } from 'react';
import {
  PackagePlus,
  Plus,
  Search,
  Truck,
  Boxes,
  Trash2,
  Calendar,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  X,
} from 'lucide-react';
import { api } from '../services/api.js';
import { formatAccraDate, getAccraToday, getAccraDateString } from '../utils/date.js';
import type { Purchase, Product, Supplier, Business } from '../types/index.js';

interface PurchasesViewProps {
  business: Business | null;
  onRefreshProducts?: () => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  business,
  onRefreshProducts,
}) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for New Stock Purchase
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<
    { productId: string; quantity: number; buyingPrice: number }[]
  >([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currency = business?.currency || 'GH₵';

  const loadData = async () => {
    try {
      setLoading(true);
      const [purchData, prodData, supData] = await Promise.all([
        api.getPurchases(),
        api.getProducts(),
        api.getSuppliers(),
      ]);
      setPurchases(purchData);
      setProducts(prodData);
      setSuppliers(supData);
    } catch (err: any) {
      setError(err.message || 'Failed to load purchases.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setSelectedSupplierId('');
    setInvoiceNumber(`SUP-INV-${Date.now().toString().slice(-4)}`);
    setPurchaseNotes('');
    setPurchaseItems([]);
    setError('');
    setModalOpen(true);
  };

  const addItemRow = () => {
    if (products.length === 0) {
      setError('Please add products to your catalog first.');
      return;
    }
    const firstProd = products[0];
    setPurchaseItems([
      ...purchaseItems,
      { productId: firstProd.id, quantity: 10, buyingPrice: firstProd.buyingPrice },
    ]);
  };

  const updateItemRow = (
    index: number,
    field: 'productId' | 'quantity' | 'buyingPrice',
    val: any
  ) => {
    const updated = [...purchaseItems];
    if (field === 'productId') {
      const prod = products.find((p) => p.id === val);
      updated[index].productId = val;
      if (prod) updated[index].buyingPrice = prod.buyingPrice;
    } else if (field === 'quantity') {
      updated[index].quantity = Math.max(1, Number(val) || 1);
    } else if (field === 'buyingPrice') {
      updated[index].buyingPrice = Math.max(0, Number(val) || 0);
    }
    setPurchaseItems(updated);
  };

  const removeItemRow = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return purchaseItems.reduce((sum, item) => sum + item.quantity * item.buyingPrice, 0);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseItems.length === 0) {
      setError('Please add at least one product item to this purchase.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const sup = suppliers.find((s) => s.id === selectedSupplierId);

      const itemsPayload = purchaseItems.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          productName: prod ? prod.name : 'Unknown Product',
          sku: prod ? prod.sku : '',
          quantity: item.quantity,
          buyingPrice: item.buyingPrice,
          total: item.quantity * item.buyingPrice,
        };
      });

      const totalAmount = calculateTotal();

      await api.createPurchase({
        supplierId: selectedSupplierId || undefined,
        supplierName: sup ? sup.name : 'Direct Stock-In',
        invoiceNumber,
        items: itemsPayload,
        totalAmount,
        notes: purchaseNotes,
      });

      setSuccessMsg('Stock-in purchase recorded successfully! Inventory has been incremented.');
      setTimeout(() => setSuccessMsg(''), 4000);

      await loadData();
      onRefreshProducts?.();
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to record purchase.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPurchasesAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Stock-In Purchases & Replenishment
          </h1>
          <p className="text-xs text-slate-400">
            Record supplier orders and automatically increment inventory stock
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition"
        >
          <PackagePlus className="w-4 h-4" />
          <span>Record New Stock-In</span>
        </button>
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

      {/* Summary Card */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 font-semibold">Total Stock Purchases</span>
          <p className="text-xl font-black text-white mt-0.5">
            {currency} {totalPurchasesAmount.toFixed(2)}
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
          <Boxes className="w-5 h-5" />
        </div>
      </div>

      {/* Purchases History Ledger */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Stock Purchase History</h3>
          <span className="text-xs text-slate-400 font-mono">
            {purchases.length} purchase record{purchases.length === 1 ? '' : 's'}
          </span>
        </div>

        {purchases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Supplier</th>
                  <th className="pb-3">Ref / Invoice No</th>
                  <th className="pb-3">Items Restocked</th>
                  <th className="pb-3">Total Amount</th>
                  <th className="pb-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {purchases.map((purch) => (
                  <tr key={purch.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 text-slate-400 font-mono">
                      {formatAccraDate(purch.purchaseDate)}
                    </td>

                    <td className="py-3.5 font-bold text-slate-200">{purch.supplierName}</td>

                    <td className="py-3.5 font-mono text-slate-400">
                      {purch.invoiceNumber || 'N/A'}
                    </td>

                    <td className="py-3.5 text-slate-300">
                      <div className="space-y-0.5">
                        {purch.items.map((i, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="font-semibold text-emerald-400">+{i.quantity}</span>
                            <span>{i.productName}</span>
                            <span className="text-slate-500 font-mono">
                              (@ {currency} {i.buyingPrice.toFixed(2)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 font-bold text-white font-mono text-sm">
                      {currency} {purch.totalAmount.toFixed(2)}
                    </td>

                    <td className="py-3.5 text-slate-500">{purch.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500">
            <PackagePlus className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <h4 className="text-sm font-bold text-slate-300">No Stock Purchases Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Record inventory restocks from wholesalers or direct purchases to keep your stock accurate.
            </p>
            <button
              onClick={openAddModal}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              + RECORD STOCK-IN
            </button>
          </div>
        )}
      </div>

      {/* New Purchase Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <PackagePlus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Record Stock-In (Purchase)</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Select Supplier (Optional)
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="">Direct Stock-In / No Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Supplier Invoice / Ref Number
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-88349"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">
                    Products to Restock ({purchaseItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Product Row</span>
                  </button>
                </div>

                {purchaseItems.length > 0 ? (
                  <div className="space-y-2">
                    {purchaseItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center gap-2 text-xs"
                      >
                        <select
                          value={item.productId}
                          onChange={(e) => updateItemRow(idx, 'productId', e.target.value)}
                          className="w-full sm:flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Current: {p.quantity})
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500">Qty:</span>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500">Buy Price:</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.buyingPrice}
                              onChange={(e) => updateItemRow(idx, 'buyingPrice', e.target.value)}
                              className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono text-right"
                            />
                          </div>

                          <span className="w-20 text-right font-bold text-white font-mono">
                            {currency} {(item.quantity * item.buyingPrice).toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="p-1 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl text-xs">
                    No products added yet. Click &quot;+ Add Product Row&quot; above to select items.
                  </div>
                )}
              </div>

              {/* Total Summary */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Total Purchase Cost:</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  {currency} {calculateTotal().toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Purchase Notes
                </label>
                <textarea
                  rows={2}
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="Optional notes or payment terms with supplier"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || purchaseItems.length === 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Saving & Incrementing Stock...' : 'Confirm & Restock Products'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
