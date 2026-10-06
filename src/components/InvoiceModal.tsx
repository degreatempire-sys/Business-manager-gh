import React, { useState, useEffect } from 'react';
import { X, Printer, MessageSquare, Plus, Trash2, CheckCircle2, FileText, Calendar, Building2 } from 'lucide-react';
import type { Invoice, Business, Customer, Product } from '../types/index.js';
import { api } from '../services/api.js';
import { openWhatsApp, generateInvoiceWhatsAppMessage } from '../utils/whatsapp.js';
import { getAccraToday, formatAccraDate, getAccraDateString } from '../utils/date.js';

export interface InvoiceModalProps {
  isOpen: boolean;
  invoice?: Invoice | null;
  isCreateMode?: boolean;
  business: Business | null;
  customers?: Customer[];
  onSave?: (invoiceData: Partial<Invoice>) => Promise<void>;
  onCreated?: () => void;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  invoice,
  isCreateMode = false,
  business,
  customers = [],
  onSave,
  onCreated,
  onClose,
}) => {
  // If modal is not open, do not render or process anything
  if (!isOpen) return null;

  const isEditing = isCreateMode || !invoice?.id;

  // Local customer & product cache
  const [internalCustomers, setInternalCustomers] = useState<Customer[]>(customers);
  const [internalProducts, setInternalProducts] = useState<Product[]>([]);

  // Form state
  const [customerId, setCustomerId] = useState(invoice?.customerId || '');
  const [customerName, setCustomerName] = useState(invoice?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(invoice?.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState(invoice?.customerEmail || '');
  const [customerAddress, setCustomerAddress] = useState(invoice?.customerAddress || '');
  const [issueDate, setIssueDate] = useState(
    invoice?.issueDate ? getAccraDateString(invoice.issueDate) : getAccraToday()
  );
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate
      ? getAccraDateString(invoice.dueDate)
      : getAccraDateString(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
  );
  const [status, setStatus] = useState<any>(invoice?.status || 'Sent');
  const [notes, setNotes] = useState(
    invoice?.notes || 'Payment is requested within 14 days of invoice date.'
  );
  const [discount, setDiscount] = useState<number>(invoice?.discount || 0);
  const [amountPaid, setAmountPaid] = useState<number>(invoice?.amountPaid || 0);

  const [items, setItems] = useState<Array<{ description: string; quantity: number; unitPrice: number }>>(
    invoice?.items?.length
      ? invoice.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        }))
      : [{ description: '', quantity: 1, unitPrice: 0 }]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch customers if not provided & fetch products
  useEffect(() => {
    let isMounted = true;
    if (customers && customers.length > 0) {
      setInternalCustomers(customers);
    } else {
      api
        .getCustomers()
        .then((data) => {
          if (isMounted && Array.isArray(data)) {
            setInternalCustomers(data);
          }
        })
        .catch(() => {});
    }

    api
      .getProducts()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setInternalProducts(data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [customers]);

  // Synchronize form values whenever invoice or isCreateMode changes
  useEffect(() => {
    if (isCreateMode || !invoice?.id) {
      setCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAddress('');
      setIssueDate(getAccraToday());
      setDueDate(getAccraDateString(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)));
      setStatus('Sent');
      setNotes('Payment is requested within 14 days of invoice date.');
      setDiscount(0);
      setAmountPaid(0);
      setItems([{ description: '', quantity: 1, unitPrice: 0 }]);
    } else if (invoice) {
      setCustomerId(invoice.customerId || '');
      setCustomerName(invoice.customerName || '');
      setCustomerPhone(invoice.customerPhone || '');
      setCustomerEmail(invoice.customerEmail || '');
      setCustomerAddress(invoice.customerAddress || '');
      setIssueDate(invoice.issueDate ? getAccraDateString(invoice.issueDate) : getAccraToday());
      setDueDate(
        invoice.dueDate
          ? getAccraDateString(invoice.dueDate)
          : getAccraDateString(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
      );
      setStatus(invoice.status || 'Sent');
      setNotes(invoice.notes || '');
      setDiscount(invoice.discount || 0);
      setAmountPaid(invoice.amountPaid || 0);
      setItems(
        invoice.items?.length
          ? invoice.items.map((it) => ({
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
            }))
          : [{ description: '', quantity: 1, unitPrice: 0 }]
      );
    }
    setError('');
  }, [invoice, isCreateMode]);

  const customerList = internalCustomers || [];
  const productList = internalProducts || [];

  // Handle customer pick
  const handleSelectCustomer = (id: string) => {
    setCustomerId(id);
    const selected = customerList.find((c) => c && c.id === id);
    if (selected) {
      setCustomerName(selected.name || '');
      setCustomerPhone(selected.phone || '');
      setCustomerEmail(selected.email || '');
      setCustomerAddress(selected.address || '');
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setItems([{ description: '', quantity: 1, unitPrice: 0 }]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        (updated[index] as any)[field] = value;
      }
      return updated;
    });
  };

  // Calculations
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0),
    0
  );
  const total = Math.max(0, subtotal - (Number(discount) || 0));
  const balance = Math.max(0, total - (Number(amountPaid) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Please provide customer name.');
      return;
    }
    // Remove unused empty lines or zero-price placeholder lines before saving
    const validItems = items
      .map((i) => ({
        description: (i.description || '').trim(),
        quantity: Math.max(1, Number(i.quantity) || 1),
        unitPrice: Math.max(0, Number(i.unitPrice) || 0),
      }))
      .filter((i) => i.description.length > 0 && i.unitPrice > 0);

    if (validItems.length === 0) {
      setError('Please add at least one line item with a product name and unit price.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const invoicePayload: Partial<Invoice> = {
        customerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        customerAddress: customerAddress.trim(),
        issueDate,
        dueDate,
        status,
        notes,
        discount: Number(discount) || 0,
        amountPaid: Number(amountPaid) || 0,
        items: validItems.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.quantity * i.unitPrice,
        })),
      };

      if (onSave) {
        await onSave(invoicePayload);
      } else if (invoice?.id && !isCreateMode) {
        await api.updateInvoice(invoice.id, invoicePayload);
      } else {
        await api.createInvoice(invoicePayload);
      }

      if (onCreated) {
        onCreated();
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    if (!invoice) return;
    const text = generateInvoiceWhatsAppMessage(invoice, business || undefined);
    openWhatsApp(invoice.customerPhone || '', text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 print:hidden">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">
              {invoice?.id && !isEditing ? `Invoice ${invoice.invoiceNumber}` : 'Create New Invoice'}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {invoice?.id && !isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-xs font-medium text-emerald-100"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* View / Edit Mode */}
        {isEditing ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Customer Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Select Existing Customer (Optional)
                </label>
                <select
                  value={customerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="">-- Choose Customer or Enter Below --</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Kofi Mensah / Makola Store"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Customer Phone (WhatsApp)
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 0244123456"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Customer Address / Location
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="e.g. Osu, Accra"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Dates & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Products / Services *
                </label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <datalist id="invoice-product-options">
                {productList.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} (GH₵{p.sellingPrice.toFixed(2)})
                  </option>
                ))}
              </datalist>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      list="invoice-product-options"
                      placeholder="Description (e.g. Rice 5kg / Web Design)"
                      value={item.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matched = productList.find(
                          (p) => p.name.toLowerCase() === val.trim().toLowerCase()
                        );
                        setItems((prev) => {
                          const updated = [...prev];
                          if (updated[index]) {
                            updated[index] = {
                              ...updated[index],
                              description: val,
                              unitPrice:
                                matched && (!updated[index].unitPrice || updated[index].unitPrice === 0)
                                  ? matched.sellingPrice
                                  : updated[index].unitPrice,
                            };
                          }
                          return updated;
                        });
                      }}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className="w-16 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-center text-white"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-2 text-xs text-slate-400">GH₵</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-2 py-2 text-xs text-right text-white"
                      />
                    </div>
                    <span className="w-24 text-right text-xs font-semibold text-slate-200">
                      GH₵{((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-slate-400 hover:text-red-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals and Discount */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Subtotal:</span>
                <span>GH₵{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-300">
                <span>Discount (GH₵):</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs text-white"
                />
              </div>
              <div className="flex justify-between items-center text-xs text-slate-300">
                <span>Amount Paid upfront (GH₵):</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                  className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs text-white"
                />
              </div>
              <div className="flex justify-between text-sm font-bold text-emerald-400 pt-2 border-t border-slate-800">
                <span>Total Amount:</span>
                <span>GH₵{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-amber-400">
                <span>Balance Due:</span>
                <span>GH₵{balance.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Payment Instructions / Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. MTN MoMo Merchant: 123456 / Bank details..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Saving...' : 'Generate Invoice'}
              </button>
            </div>
          </form>
        ) : invoice ? (
          /* View & Print Mode */
          <div className="p-8 bg-white text-slate-900 font-sans text-xs select-text overflow-y-auto max-h-[80vh]">
            <div className="flex justify-between items-start pb-6 border-b border-slate-200">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                  {business?.name || 'Business Manager GH'}
                </h1>
                <p className="text-slate-600 text-xs mt-1">{business?.location || 'Ghana'}</p>
                {business?.phone && <p className="text-slate-600 text-xs">Tel: {business.phone}</p>}
                {business?.email && <p className="text-slate-600 text-xs">{business.email}</p>}
              </div>
              <div className="text-right">
                <div className="inline-block px-3 py-1 bg-slate-100 rounded text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                  INVOICE
                </div>
                <p className="text-sm font-black text-slate-900">#{invoice.invoiceNumber || '---'}</p>
                <p className="text-slate-500 text-xs mt-1">Date: {invoice.issueDate ? formatAccraDate(invoice.issueDate) : '-'}</p>
                <p className="text-red-600 font-semibold text-xs">Due: {invoice.dueDate ? formatAccraDate(invoice.dueDate) : '-'}</p>
              </div>
            </div>

            <div className="py-6 grid grid-cols-2 gap-6 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Billed To
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  {invoice.customerName || 'Customer'}
                </h3>
                {invoice.customerPhone && (
                  <p className="text-slate-600 text-xs">{invoice.customerPhone}</p>
                )}
                {invoice.customerAddress && (
                  <p className="text-slate-600 text-xs">{invoice.customerAddress}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Payment Status
                </span>
                <div className="mt-1">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      invoice.status === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : invoice.status === 'Overdue'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {invoice.status || 'Sent'}
                  </span>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="py-6 border-b border-slate-200">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-300 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2 text-right">Unit Price (GH₵)</th>
                    <th className="pb-2 text-right">Total (GH₵)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(invoice.items || [])
                    .filter(
                      (it) =>
                        it &&
                        it.description &&
                        it.description.trim() &&
                        (Number(it.unitPrice) > 0 ||
                          ((invoice.items?.length || 0) <= 1 && Number(it.quantity) > 0))
                    )
                    .map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 font-medium text-slate-800">{item.description}</td>
                        <td className="py-2.5 text-center text-slate-600">{item.quantity}</td>
                        <td className="py-2.5 text-right text-slate-600">
                          {(Number(item.unitPrice) || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right font-bold text-slate-900">
                          {(
                            Number(
                              item.total ||
                                (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)
                            ) || 0
                          ).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="py-4 flex justify-end">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>GH₵{(Number(invoice.subtotal) || 0).toFixed(2)}</span>
                </div>
                {(Number(invoice.discount) || 0) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-GH₵{(Number(invoice.discount) || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>Total:</span>
                  <span>GH₵{(Number(invoice.total) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Paid:</span>
                  <span>GH₵{(Number(invoice.amountPaid) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-red-600 bg-red-50 p-2 rounded">
                  <span>Balance Due:</span>
                  <span>GH₵{(Number(invoice.balance) || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="pt-4 border-t border-slate-200 text-xs text-slate-500">
                <span className="font-bold text-slate-700">Notes & Payment Details:</span>
                <p className="mt-1 whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
