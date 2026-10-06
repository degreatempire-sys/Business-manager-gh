import React from 'react';
import { Printer, MessageSquare, X, CheckCircle2, Download, Copy, Store } from 'lucide-react';
import type { Sale, Business } from '../types/index.js';
import { openWhatsApp, generateReceiptWhatsAppMessage } from '../utils/whatsapp.js';
import { formatAccraDateTime } from '../utils/date.js';

interface ReceiptModalProps {
  sale: Sale | null;
  business: Business | null;
  enableWhatsappReceipts?: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  business,
  enableWhatsappReceipts = true,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const text = generateReceiptWhatsAppMessage(sale, business || undefined);
    openWhatsApp(sale.customerPhone || '', text);
  };

  const handleCopy = () => {
    const text = generateReceiptWhatsAppMessage(sale, business || undefined);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header bar (hide in print) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 print:hidden">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Sales Receipt Ready</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons Bar (hide in print) */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/60 border-b border-slate-800 text-xs print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-emerald-100 font-medium border border-emerald-500/30 transition"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Automated WhatsApp Delivery Notification Banner (hide in print) */}
        {sale.customerPhone && (
          <div className="px-4 pt-3 pb-1 print:hidden">
            {enableWhatsappReceipts ? (
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <div className="text-left leading-tight">
                    <p className="font-semibold text-emerald-300">Automatic WhatsApp Delivery</p>
                    <p className="text-[11px] text-emerald-400/80">
                      Target: <span className="font-mono text-white">{sale.customerPhone}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleWhatsApp}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition shadow-xs"
                >
                  Send Now
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px]">Auto receipt delivery disabled in settings.</span>
                </div>
                <button
                  onClick={handleWhatsApp}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-2 ml-2"
                >
                  Send manually
                </button>
              </div>
            )}
          </div>
        )}

        {/* Printable Thermal Receipt Card */}
        <div id="printable-receipt" className="p-6 bg-white text-slate-900 font-mono text-xs leading-relaxed select-text">
          {/* Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            {business?.logo ? (
              <img
                src={business.logo}
                alt="Logo"
                className="w-12 h-12 mx-auto rounded-full object-cover mb-2 border border-slate-200"
              />
            ) : (
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
                <Store className="w-5 h-5" />
              </div>
            )}
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 font-sans">
              {business?.name || 'Business Manager GH'}
            </h2>
            <p className="text-slate-600 text-[11px] font-sans">
              {business?.location || 'Accra, Ghana'}
            </p>
            {business?.phone && (
              <p className="text-slate-600 text-[11px] font-sans">Tel: {business.phone}</p>
            )}
            {business?.email && (
              <p className="text-slate-600 text-[10px] font-sans">{business.email}</p>
            )}
          </div>

          {/* Receipt Info */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt No:</span>
              <span className="font-bold">{sale.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span>{formatAccraDateTime(sale.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-semibold">{sale.customerName || 'Walk-in Customer'}</span>
            </div>
            {sale.customerPhone && (
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span>{sale.customerPhone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier / Staff:</span>
              <span>{sale.createdBy || 'Admin'}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <div className="grid grid-cols-12 font-bold text-slate-700 pb-1 border-b border-slate-200 text-[11px]">
              <span className="col-span-6">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-4 text-right">Amount (GH₵)</span>
            </div>
            <div className="divide-y divide-slate-100 py-1">
              {sale.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 py-1 text-[11px]">
                  <span className="col-span-6 font-medium text-slate-800 truncate pr-1">
                    {item.productName}
                  </span>
                  <span className="col-span-2 text-center text-slate-600">x{item.quantity}</span>
                  <span className="col-span-4 text-right font-semibold">
                    {item.total.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>GH₵{sale.subtotal.toFixed(2)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount:</span>
                <span>-GH₵{sale.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
              <span>TOTAL:</span>
              <span>GH₵{sale.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Paid ({sale.paymentMethod}):</span>
              <span className="font-semibold">GH₵{sale.amountPaid.toFixed(2)}</span>
            </div>
            {sale.balance > 0 ? (
              <div className="flex justify-between text-amber-700 font-bold bg-amber-50 p-1.5 rounded">
                <span>BALANCE DUE (Debt):</span>
                <span>GH₵{sale.balance.toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-emerald-800 font-semibold text-[10px]">
                <span>Status:</span>
                <span>PAID IN FULL</span>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="pt-4 text-center text-[10px] text-slate-500 font-sans space-y-1">
            <p className="font-medium text-slate-700">
              {business?.receiptNote || 'Thank you for your business! Please visit again.'}
            </p>
            <p className="text-slate-400">Powered by Business Manager GH</p>
          </div>
        </div>

        {/* Modal Close Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
