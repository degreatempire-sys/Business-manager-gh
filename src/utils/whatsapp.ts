import type { Sale, Customer, Invoice, Business } from '../types/index.js';
import { formatAccraDateTime } from './date.js';

export function formatGhanaPhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('0')) {
    // 024xxxxxxx -> 23324xxxxxxx
    cleaned = '233' + cleaned.substring(1);
  } else if (!cleaned.startsWith('233') && cleaned.length >= 9) {
    cleaned = '233' + cleaned;
  }

  return cleaned;
}

export function openWhatsApp(phone: string, text: string) {
  const formattedNumber = formatGhanaPhone(phone);
  const encodedText = encodeURIComponent(text);
  const url = formattedNumber
    ? `https://wa.me/${formattedNumber}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  window.open(url, '_blank', 'noopener,noreferrer');
}

export function generateReceiptWhatsAppMessage(sale: Sale, business?: Business | null): string {
  const bizName = business?.name || 'Our Shop';
  const bizPhone = business?.phone ? `\n📞 Tel: ${business.phone}` : '';
  const bizLoc = business?.location ? `\n📍 Location: ${business.location}` : '';
  const currency = business?.currency || 'GH₵';

  const itemsList = sale.items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.productName}* x${item.quantity} = ${currency}${item.total.toFixed(2)}`
    )
    .join('\n');

  const discountLine =
    sale.discount > 0 ? `\n🎁 Discount: -${currency}${sale.discount.toFixed(2)}` : '';
  const balanceLine =
    sale.balance > 0
      ? `\n⚠️ Balance Remaining: *${currency}${sale.balance.toFixed(2)}*`
      : '\n✅ Status: *Paid in Full*';

  return `🧾 *SALES RECEIPT - ${bizName.toUpperCase()}*
${bizLoc}${bizPhone}
----------------------------------------
*Receipt No:* ${sale.receiptNumber}
*Date:* ${formatAccraDateTime(sale.createdAt)}
*Customer:* ${sale.customerName || 'Valued Customer'}
----------------------------------------
*ITEMS:*
${itemsList}
----------------------------------------
*Subtotal:* ${currency}${sale.subtotal.toFixed(2)}${discountLine}
*TOTAL:* *${currency}${sale.total.toFixed(2)}*
*Amount Paid:* ${currency}${sale.amountPaid.toFixed(2)} (${sale.paymentMethod})${balanceLine}
----------------------------------------
_${business?.receiptNote || `Thank you for choosing ${bizName}! Medaase.`}_`;
}

export function generateDebtReminderWhatsAppMessage(
  customer: Customer,
  amountOwed: number,
  business?: Business | null,
  lastReceiptNumber?: string
): string {
  const bizName = business?.name || 'Our Business';
  const currency = business?.currency || 'GH₵';

  return `Hello ${customer.name}, this is a friendly reminder from ${bizName} that your outstanding balance is ${currency}${amountOwed.toFixed(
    2
  )}${lastReceiptNumber ? ` on receipt #${lastReceiptNumber}` : ''}. Please contact us if you have already made payment. Thank you.`;
}

export function generateDebtPaymentReceiptWhatsAppMessage(
  receipt: {
    paymentNumber: string;
    date: string;
    businessName: string;
    businessPhone?: string;
    customerName: string;
    originalDebt: number;
    paymentAmount: number;
    paymentMethod: string;
    remainingBalance: number;
    reference?: string;
    cashier?: string;
  },
  currency: string = 'GH₵'
): string {
  const bizPhone = receipt.businessPhone ? `\n📞 Tel: ${receipt.businessPhone}` : '';
  const refLine = receipt.reference ? `\n📝 Ref: ${receipt.reference}` : '';

  return `🧾 *OFFICIAL PAYMENT RECEIPT - ${receipt.businessName.toUpperCase()}*${bizPhone}
----------------------------------------
*Payment No:* ${receipt.paymentNumber}
*Date:* ${new Date(receipt.date).toLocaleString('en-GB')}
*Customer:* ${receipt.customerName}
----------------------------------------
*Previous Debt:* ${currency}${receipt.originalDebt.toFixed(2)}
*Amount Paid:* *${currency}${receipt.paymentAmount.toFixed(2)}* (${receipt.paymentMethod})${refLine}
*Remaining Balance:* *${currency}${receipt.remainingBalance.toFixed(2)}*
*Status:* ${receipt.remainingBalance <= 0 ? '✅ Settled in Full' : '⚠️ Outstanding Balance'}
*Cashier/Staff:* ${receipt.cashier || 'Staff'}
----------------------------------------
Thank you for your payment!`;
}

export function generateInvoiceWhatsAppMessage(invoice: Invoice, business?: Business | null): string {
  const bizName = business?.name || 'Our Company';
  const currency = business?.currency || 'GH₵';

  return `Hello *${invoice.customerName}*,

Please find the invoice details from *${bizName}*:

📄 *INVOICE #${invoice.invoiceNumber}*
📅 *Issue Date:* ${new Date(invoice.issueDate).toLocaleDateString('en-GB')}
⏰ *Due Date:* ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : 'Immediate'}
💰 *Total Amount:* *${currency}${invoice.total.toFixed(2)}*
💳 *Amount Paid:* ${currency}${invoice.amountPaid.toFixed(2)}
⚠️ *Balance Due:* *${currency}${invoice.balance.toFixed(2)}*

Please let us know once payment has been made.

Thank you for your business!
*${bizName}*`;
}

export function openWhatsAppReceipt(sale: Sale, business?: Business | null) {
  const msg = generateReceiptWhatsAppMessage(sale, business);
  openWhatsApp(sale.customerPhone || '', msg);
}

export function openWhatsAppDebtReminder(
  customer: Customer,
  amountOwed: number,
  business?: Business | null,
  lastReceiptNumber?: string
) {
  const msg = generateDebtReminderWhatsAppMessage(customer, amountOwed, business, lastReceiptNumber);
  openWhatsApp(customer.phone || '', msg);
}

export function openWhatsAppDebtPaymentReceipt(
  receipt: any,
  currency: string = 'GH₵'
) {
  const msg = generateDebtPaymentReceiptWhatsAppMessage(receipt, currency);
  openWhatsApp(receipt.customerPhone || '', msg);
}

export function openWhatsAppInvoice(invoice: Invoice, business?: Business | null) {
  const msg = generateInvoiceWhatsAppMessage(invoice, business);
  openWhatsApp(invoice.customerPhone || '', msg);
}
