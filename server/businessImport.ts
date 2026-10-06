/**
 * STAGE 5B — CONTROLLED CSV IMPORT ENGINE
 * Server-authoritative validation, preview, duplicate detection, and transactional commit
 * for Products and Customers.
 */

import { db, DBUser } from './db.js';

export interface ImportError {
  row: number;
  field?: string;
  message: string;
}

export interface ProductImportRow {
  name: string;
  sku: string;
  category: string;
  sellingPrice: number;
  costPrice: number;
  quantity: number;
  minStockLevel: number;
  unit: string;
}

export interface CustomerImportRow {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  creditLimit: number;
}

export interface ValidationResult<T> {
  valid: boolean;
  errors: ImportError[];
  preview: T[];
  totalRows: number;
}

/**
 * Standard RFC-4180 compliant CSV parser
 */
export function parseCsv(text: string): string[][] {
  if (!text || typeof text !== 'string') return [];
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.length > 0 && currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.length > 0 && currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 0 && currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Validate Product CSV
 */
export function validateProductCsv(businessId: string, csvContent: string): ValidationResult<ProductImportRow> {
  const parsed = parseCsv(csvContent);
  const errors: ImportError[] = [];
  const preview: ProductImportRow[] = [];

  if (parsed.length === 0) {
    return {
      valid: false,
      errors: [{ row: 0, message: 'CSV file is empty or contains no readable rows.' }],
      preview: [],
      totalRows: 0,
    };
  }

  const rawHeaders = parsed[0];
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[normalizeHeader(h)] = idx;
  });

  const nameIdx = headerMap['name'] ?? headerMap['productname'] ?? headerMap['title'];
  const skuIdx = headerMap['sku'] ?? headerMap['barcode'] ?? headerMap['productcode'];
  const priceIdx = headerMap['sellingprice'] ?? headerMap['price'] ?? headerMap['unitprice'];
  const costIdx = headerMap['costprice'] ?? headerMap['buyingprice'] ?? headerMap['cost'];
  const qtyIdx = headerMap['quantity'] ?? headerMap['qty'] ?? headerMap['stock'];
  const minStockIdx = headerMap['minstocklevel'] ?? headerMap['minstock'] ?? headerMap['reorderlevel'];
  const catIdx = headerMap['category'];
  const unitIdx = headerMap['unit'];

  if (nameIdx === undefined) {
    errors.push({ row: 1, field: 'name', message: 'Missing required column header: "name" or "productName"' });
  }
  if (skuIdx === undefined) {
    errors.push({ row: 1, field: 'sku', message: 'Missing required column header: "sku"' });
  }
  if (priceIdx === undefined) {
    errors.push({ row: 1, field: 'sellingPrice', message: 'Missing required column header: "sellingPrice" or "price"' });
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      preview: [],
      totalRows: parsed.length - 1,
    };
  }

  // Fetch existing business products to prevent duplicate SKUs
  const existingProducts = db.getProducts ? db.getProducts(businessId) : [];
  const existingSkus = new Set(
    existingProducts
      .filter((p) => !p.isDeleted && p.sku)
      .map((p) => p.sku!.trim().toLowerCase())
  );
  const csvSkus = new Set<string>();

  for (let r = 1; r < parsed.length; r++) {
    const row = parsed[r];
    const rowNum = r + 1; // 1-indexed for human readability

    // Skip empty lines
    if (row.length === 0 || row.every((c) => c === '')) continue;

    const name = nameIdx !== undefined && row[nameIdx] !== undefined ? row[nameIdx].trim() : '';
    const sku = skuIdx !== undefined && row[skuIdx] !== undefined ? row[skuIdx].trim() : '';
    const rawPrice = priceIdx !== undefined && row[priceIdx] !== undefined ? row[priceIdx].trim() : '';
    const rawCost = costIdx !== undefined && row[costIdx] !== undefined ? row[costIdx].trim() : '';
    const rawQty = qtyIdx !== undefined && row[qtyIdx] !== undefined ? row[qtyIdx].trim() : '';
    const rawMin = minStockIdx !== undefined && row[minStockIdx] !== undefined ? row[minStockIdx].trim() : '';
    const category = catIdx !== undefined && row[catIdx] !== undefined && row[catIdx].trim() ? row[catIdx].trim() : 'General';
    const unit = unitIdx !== undefined && row[unitIdx] !== undefined && row[unitIdx].trim() ? row[unitIdx].trim() : 'pcs';

    if (!name) {
      errors.push({ row: rowNum, field: 'name', message: 'Product name cannot be empty.' });
    }

    if (!sku) {
      errors.push({ row: rowNum, field: 'sku', message: 'SKU cannot be empty.' });
    } else {
      const lowerSku = sku.toLowerCase();
      if (existingSkus.has(lowerSku)) {
        errors.push({
          row: rowNum,
          field: 'sku',
          message: `Duplicate SKU: "${sku}" already exists in your inventory. Overwrite is not permitted.`,
        });
      } else if (csvSkus.has(lowerSku)) {
        errors.push({
          row: rowNum,
          field: 'sku',
          message: `Duplicate SKU in CSV: "${sku}" appears more than once.`,
        });
      } else {
        csvSkus.add(lowerSku);
      }
    }

    const price = Number(rawPrice);
    if (rawPrice === '' || isNaN(price) || price < 0) {
      errors.push({ row: rowNum, field: 'sellingPrice', message: 'Selling price must be a valid non-negative number.' });
    }

    let cost = 0;
    if (rawCost !== '') {
      cost = Number(rawCost);
      if (isNaN(cost) || cost < 0) {
        errors.push({ row: rowNum, field: 'costPrice', message: 'Cost price must be a valid non-negative number.' });
      }
    }

    let quantity = 0;
    if (rawQty !== '') {
      quantity = Number(rawQty);
      if (isNaN(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
        errors.push({ row: rowNum, field: 'quantity', message: 'Quantity must be a non-negative whole number (integer).' });
      }
    }

    let minStock = 5;
    if (rawMin !== '') {
      minStock = Number(rawMin);
      if (isNaN(minStock) || minStock < 0 || !Number.isInteger(minStock)) {
        errors.push({ row: rowNum, field: 'minStockLevel', message: 'Minimum stock level must be a non-negative integer.' });
      }
    }

    preview.push({
      name,
      sku,
      category,
      sellingPrice: isNaN(price) ? 0 : price,
      costPrice: isNaN(cost) ? 0 : cost,
      quantity: isNaN(quantity) ? 0 : quantity,
      minStockLevel: isNaN(minStock) ? 5 : minStock,
      unit,
    });
  }

  return {
    valid: errors.length === 0 && preview.length > 0,
    errors,
    preview,
    totalRows: preview.length,
  };
}

/**
 * Validate Customer CSV
 */
export function validateCustomerCsv(businessId: string, csvContent: string): ValidationResult<CustomerImportRow> {
  const parsed = parseCsv(csvContent);
  const errors: ImportError[] = [];
  const preview: CustomerImportRow[] = [];

  if (parsed.length === 0) {
    return {
      valid: false,
      errors: [{ row: 0, message: 'CSV file is empty or contains no readable rows.' }],
      preview: [],
      totalRows: 0,
    };
  }

  const rawHeaders = parsed[0];
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[normalizeHeader(h)] = idx;
  });

  const nameIdx = headerMap['name'] ?? headerMap['customername'] ?? headerMap['fullname'];
  const phoneIdx = headerMap['phone'] ?? headerMap['phonenumber'] ?? headerMap['mobile'] ?? headerMap['telephone'];
  const emailIdx = headerMap['email'] ?? headerMap['emailaddress'];
  const addrIdx = headerMap['address'] ?? headerMap['location'];
  const limitIdx = headerMap['creditlimit'] ?? headerMap['limit'];

  if (nameIdx === undefined) {
    errors.push({ row: 1, field: 'name', message: 'Missing required column header: "name"' });
  }
  if (phoneIdx === undefined) {
    errors.push({ row: 1, field: 'phone', message: 'Missing required column header: "phone"' });
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      preview: [],
      totalRows: parsed.length - 1,
    };
  }

  // Fetch existing customers for duplicate checks (by phone and email)
  const existingCustomers = db.getCustomers ? db.getCustomers(businessId) : [];
  const existingPhones = new Set(
    existingCustomers
      .filter((c) => !c.isDeleted && c.phone)
      .map((c) => c.phone.trim().replace(/[^0-9]/g, ''))
  );
  const existingEmails = new Set(
    existingCustomers
      .filter((c) => !c.isDeleted && c.email)
      .map((c) => c.email!.trim().toLowerCase())
  );

  const csvPhones = new Set<string>();
  const csvEmails = new Set<string>();

  for (let r = 1; r < parsed.length; r++) {
    const row = parsed[r];
    const rowNum = r + 1;

    // Skip empty lines
    if (row.length === 0 || row.every((c) => c === '')) continue;

    const name = nameIdx !== undefined && row[nameIdx] !== undefined ? row[nameIdx].trim() : '';
    const phone = phoneIdx !== undefined && row[phoneIdx] !== undefined ? row[phoneIdx].trim() : '';
    const email = emailIdx !== undefined && row[emailIdx] !== undefined && row[emailIdx].trim() ? row[emailIdx].trim() : undefined;
    const address = addrIdx !== undefined && row[addrIdx] !== undefined && row[addrIdx].trim() ? row[addrIdx].trim() : undefined;
    const rawLimit = limitIdx !== undefined && row[limitIdx] !== undefined ? row[limitIdx].trim() : '';

    if (!name) {
      errors.push({ row: rowNum, field: 'name', message: 'Customer name cannot be empty.' });
    }

    if (!phone) {
      errors.push({ row: rowNum, field: 'phone', message: 'Phone number cannot be empty.' });
    } else {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 7) {
        errors.push({ row: rowNum, field: 'phone', message: `Invalid phone number: "${phone}". Minimum 7 digits required.` });
      } else if (existingPhones.has(cleanPhone)) {
        errors.push({
          row: rowNum,
          field: 'phone',
          message: `Duplicate customer: Phone "${phone}" is already registered. Overwrite is not permitted.`,
        });
      } else if (csvPhones.has(cleanPhone)) {
        errors.push({
          row: rowNum,
          field: 'phone',
          message: `Duplicate phone number in CSV: "${phone}" appears more than once.`,
        });
      } else {
        csvPhones.add(cleanPhone);
      }
    }

    if (email) {
      const lowerEmail = email.toLowerCase();
      if (!lowerEmail.includes('@') || !lowerEmail.includes('.')) {
        errors.push({ row: rowNum, field: 'email', message: `Malformed email address: "${email}".` });
      } else if (existingEmails.has(lowerEmail)) {
        errors.push({
          row: rowNum,
          field: 'email',
          message: `Duplicate customer email: "${email}" already belongs to an existing customer.`,
        });
      } else if (csvEmails.has(lowerEmail)) {
        errors.push({
          row: rowNum,
          field: 'email',
          message: `Duplicate email in CSV: "${email}" appears more than once.`,
        });
      } else {
        csvEmails.add(lowerEmail);
      }
    }

    let creditLimit = 0;
    if (rawLimit !== '') {
      creditLimit = Number(rawLimit);
      if (isNaN(creditLimit) || creditLimit < 0) {
        errors.push({ row: rowNum, field: 'creditLimit', message: 'Credit limit must be a valid non-negative number.' });
      }
    }

    preview.push({
      name,
      phone,
      email,
      address,
      creditLimit: isNaN(creditLimit) ? 0 : creditLimit,
    });
  }

  return {
    valid: errors.length === 0 && preview.length > 0,
    errors,
    preview,
    totalRows: preview.length,
  };
}

/**
 * Transactional Product Import
 */
export function executeProductImport(
  businessId: string,
  user: DBUser,
  rows: ProductImportRow[]
): { success: boolean; importedCount: number; productIds: string[] } {
  if (!rows || rows.length === 0) {
    throw new Error('No valid product rows to import.');
  }

  // Pre-check for any concurrent duplicate SKU conflicts
  const currentProds = db.getProducts ? db.getProducts(businessId) : [];
  const existingSkus = new Set(currentProds.filter((p) => !p.isDeleted && p.sku).map((p) => p.sku!.trim().toLowerCase()));
  for (const r of rows) {
    if (existingSkus.has(r.sku.trim().toLowerCase())) {
      throw new Error(`Import conflict: SKU "${r.sku}" already exists in inventory.`);
    }
  }

  const createdIds: string[] = [];
  try {
    for (const r of rows) {
      const created = db.addProduct(
        {
          businessId,
          name: r.name,
          sku: r.sku,
          category: r.category,
          sellingPrice: r.sellingPrice,
          buyingPrice: r.costPrice,
          costPrice: r.costPrice,
          quantity: r.quantity,
          minStockLevel: r.minStockLevel,
          unit: r.unit,
        } as any,
        user.id
      );
      createdIds.push(created.id);
    }

    return {
      success: true,
      importedCount: createdIds.length,
      productIds: createdIds,
    };
  } catch (err: any) {
    // Transactional Rollback: delete all newly inserted products for this batch
    const rawData = (db as any).data;
    if (rawData && rawData.products && createdIds.length > 0) {
      rawData.products = rawData.products.filter((p: any) => !createdIds.includes(p.id));
      if (rawData.stock_movements) {
        rawData.stock_movements = rawData.stock_movements.filter((sm: any) => !createdIds.includes(sm.productId));
      }
      (db as any).saveData();
    }
    throw new Error(`Import transaction failed and was rolled back: ${err.message}`);
  }
}

/**
 * Transactional Customer Import
 */
export function executeCustomerImport(
  businessId: string,
  _user: DBUser,
  rows: CustomerImportRow[]
): { success: boolean; importedCount: number; customerIds: string[] } {
  if (!rows || rows.length === 0) {
    throw new Error('No valid customer rows to import.');
  }

  const currentCusts = db.getCustomers ? db.getCustomers(businessId) : [];
  const existingPhones = new Set(currentCusts.filter((c) => !c.isDeleted && c.phone).map((c) => c.phone.trim().replace(/[^0-9]/g, '')));
  for (const r of rows) {
    const cleanPhone = r.phone.replace(/[^0-9]/g, '');
    if (existingPhones.has(cleanPhone)) {
      throw new Error(`Import conflict: Customer with phone "${r.phone}" already exists.`);
    }
  }

  const createdIds: string[] = [];
  try {
    for (const r of rows) {
      const created = db.addCustomer({
        businessId,
        name: r.name,
        phone: r.phone,
        email: r.email,
        address: r.address,
        creditLimit: r.creditLimit,
        notes: 'Imported via CSV',
      });
      createdIds.push(created.id);
    }

    return {
      success: true,
      importedCount: createdIds.length,
      customerIds: createdIds,
    };
  } catch (err: any) {
    // Transactional Rollback: delete all newly inserted customers for this batch
    const rawData = (db as any).data;
    if (rawData && rawData.customers && createdIds.length > 0) {
      rawData.customers = rawData.customers.filter((c: any) => !createdIds.includes(c.id));
      (db as any).saveData();
    }
    throw new Error(`Customer import transaction failed and was rolled back: ${err.message}`);
  }
}
