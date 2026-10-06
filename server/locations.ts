import { db, DBUser } from './db.js';
import type { Location, StockTransfer, Product, Sale, Expense } from '../src/types/index.js';

export interface LocationAccessResult {
  allowed: boolean;
  reason?: string;
  location?: Location;
}

/**
 * Validates if a user is permitted to view or conduct transactions at a specified location.
 */
export function validateUserLocationAccess(
  user: DBUser,
  locationId: string,
  businessId: string
): LocationAccessResult {
  if (user.role === 'master_admin') {
    const loc = db.getLocationById(locationId, businessId);
    if (!loc) return { allowed: false, reason: 'Location not found' };
    return { allowed: true, location: loc };
  }

  if (user.businessId !== businessId) {
    return { allowed: false, reason: 'Tenant boundary violation: business mismatch' };
  }

  const loc = db.getLocationById(locationId, businessId);
  if (!loc) {
    return { allowed: false, reason: 'Location does not exist or does not belong to your business' };
  }

  // Business owners and admins have access to all locations by default
  if (user.role === 'admin' || user.role === 'business_owner') {
    return { allowed: true, location: loc };
  }

  // Staff role checks
  if (user.role === 'staff') {
    if (user.allLocations) {
      return { allowed: true, location: loc };
    }
    if (user.assignedLocationIds && user.assignedLocationIds.includes(locationId)) {
      return { allowed: true, location: loc };
    }
    return {
      allowed: false,
      reason: `Staff member is not assigned to location '${loc.name}'. Access denied.`,
      location: loc,
    };
  }

  return { allowed: false, reason: 'Unauthorized role for location access' };
}

export interface LocationSummaryMetrics {
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

/**
 * Computes consolidated or location-scoped summary metrics.
 */
export function computeLocationSummary(
  businessId: string,
  locationId?: string,
  startDate?: string,
  endDate?: string
): LocationSummaryMetrics {
  const locations = db.getLocations(businessId);
  const targetLoc = locationId ? locations.find((l) => l.id === locationId) : null;
  const defLoc = db.getDefaultLocation(businessId);

  // Sales
  const allSales = db.getSales(businessId).filter((s) => s.status !== 'Cancelled');
  const filteredSales = allSales.filter((s) => {
    if (locationId) {
      // If sale has locationId, must match; if legacy without locationId, matches default location
      const saleLoc = s.locationId || defLoc.id;
      if (saleLoc !== locationId) return false;
    }
    if (startDate && s.createdAt < startDate) return false;
    if (endDate && s.createdAt > endDate) return false;
    return true;
  });

  const totalSales = filteredSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const salesCount = filteredSales.length;
  const totalProfit = filteredSales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);

  // Expenses
  const allExpenses = db.getExpenses(businessId);
  const filteredExpenses = allExpenses.filter((e) => {
    if (locationId) {
      const expLoc = e.locationId || defLoc.id;
      if (expLoc !== locationId) return false;
    }
    if (startDate && e.date < startDate.split('T')[0]) return false;
    if (endDate && e.date > endDate.split('T')[0]) return false;
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalProfit - totalExpenses;

  // Inventory
  const products = db.getProducts(businessId);
  let inventoryUnits = 0;
  let inventoryValueGHS = 0;
  let lowStockCount = 0;

  for (const prod of products) {
    let units = 0;
    if (locationId) {
      units = db.getLocationStock(prod.id, locationId, businessId);
    } else {
      units = prod.quantity || 0;
    }
    inventoryUnits += units;
    inventoryValueGHS += units * (prod.buyingPrice || 0);
    if (units <= (prod.minStockLevel || 0)) {
      lowStockCount++;
    }
  }

  // Active Transfers
  const allTransfers = db.getStockTransfers(businessId);
  const activeTransfers = allTransfers.filter((t) => {
    if (t.status === 'COMPLETED' || t.status === 'CANCELLED' || t.status === 'REJECTED') return false;
    if (locationId) {
      return t.sourceLocationId === locationId || t.destinationLocationId === locationId;
    }
    return true;
  });

  // Assigned Staff
  const staffUsers = db.getStaffUsers(businessId);
  const assignedStaff = staffUsers.filter((u) => {
    if (u.status !== 'active') return false;
    if (!locationId) return true;
    if (u.allLocations) return true;
    return u.assignedLocationIds && u.assignedLocationIds.includes(locationId);
  });

  return {
    locationId: targetLoc ? targetLoc.id : 'all',
    locationName: targetLoc ? targetLoc.name : 'All Locations (Consolidated)',
    locationCode: targetLoc ? targetLoc.code : 'CONSOLIDATED',
    isDefault: targetLoc ? targetLoc.isDefault : false,
    status: targetLoc ? targetLoc.status : 'ACTIVE',
    totalSales,
    salesCount,
    totalProfit,
    totalExpenses,
    netProfit,
    inventoryUnits,
    inventoryValueGHS,
    lowStockCount,
    activeTransfersCount: activeTransfers.length,
    assignedStaffCount: assignedStaff.length,
  };
}

/**
 * Compares two locations across key operational metrics.
 */
export function compareLocations(
  businessId: string,
  locationIdA: string,
  locationIdB: string,
  startDate?: string,
  endDate?: string
): {
  locationA: LocationSummaryMetrics;
  locationB: LocationSummaryMetrics;
  differences: {
    salesDiffGHS: number;
    salesCountDiff: number;
    profitDiffGHS: number;
    expensesDiffGHS: number;
    netProfitDiffGHS: number;
    inventoryUnitsDiff: number;
  };
} {
  const summaryA = computeLocationSummary(businessId, locationIdA, startDate, endDate);
  const summaryB = computeLocationSummary(businessId, locationIdB, startDate, endDate);

  return {
    locationA: summaryA,
    locationB: summaryB,
    differences: {
      salesDiffGHS: summaryA.totalSales - summaryB.totalSales,
      salesCountDiff: summaryA.salesCount - summaryB.salesCount,
      profitDiffGHS: summaryA.totalProfit - summaryB.totalProfit,
      expensesDiffGHS: summaryA.totalExpenses - summaryB.totalExpenses,
      netProfitDiffGHS: summaryA.netProfit - summaryB.netProfit,
      inventoryUnitsDiff: summaryA.inventoryUnits - summaryB.inventoryUnits,
    },
  };
}

export interface LocationDiagnosticItem {
  id: string;
  category: 'DEFAULT_LOCATION' | 'CODE_UNIQUENESS' | 'STOCK_INTEGRITY' | 'TRANSFERS' | 'STAFF_MAPPING';
  severity: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  message: string;
  details?: Record<string, any>;
}

/**
 * Diagnostic health check for multi-location architecture.
 */
export function runLocationDiagnostics(businessId: string): {
  healthy: boolean;
  score: number;
  items: LocationDiagnosticItem[];
} {
  const items: LocationDiagnosticItem[] = [];
  const locations = db.getLocations(businessId);
  const products = db.getProducts(businessId);
  const transfers = db.getStockTransfers(businessId);
  const staff = db.getStaffUsers(businessId);

  // 1. Default location checks
  const defaultLocs = locations.filter((l) => l.isDefault);
  if (defaultLocs.length === 0) {
    items.push({
      id: 'default_location_check',
      category: 'DEFAULT_LOCATION',
      severity: 'CRITICAL',
      message: 'No default location configured for this business.',
    });
  } else if (defaultLocs.length > 1) {
    items.push({
      id: 'default_location_check',
      category: 'DEFAULT_LOCATION',
      severity: 'CRITICAL',
      message: `Multiple default locations found (${defaultLocs.length}). Exactly one is allowed.`,
    });
  } else {
    const def = defaultLocs[0];
    if (def.status !== 'ACTIVE') {
      items.push({
        id: 'default_location_check',
        category: 'DEFAULT_LOCATION',
        severity: 'CRITICAL',
        message: 'The default location is inactive. Default location must always be active.',
      });
    } else {
      items.push({
        id: 'default_location_check',
        category: 'DEFAULT_LOCATION',
        severity: 'HEALTHY',
        message: `Default location is active and valid (${def.name} - ${def.code}).`,
      });
    }
  }

  // 2. Code uniqueness
  const codeMap = new Map<string, number>();
  for (const loc of locations) {
    const norm = loc.code.toUpperCase().trim();
    codeMap.set(norm, (codeMap.get(norm) || 0) + 1);
  }
  let hasCodeDupes = false;
  for (const [c, count] of codeMap.entries()) {
    if (count > 1) {
      hasCodeDupes = true;
      items.push({
        id: 'location_codes_unique',
        category: 'CODE_UNIQUENESS',
        severity: 'CRITICAL',
        message: `Duplicate location code '${c}' found across ${count} locations in this business.`,
      });
    }
  }
  if (!hasCodeDupes) {
    items.push({
      id: 'location_codes_unique',
      category: 'CODE_UNIQUENESS',
      severity: 'HEALTHY',
      message: `All ${locations.length} location codes are unique within this business.`,
    });
  }

  // 3. Stock integrity
  let stockDiscrepancies = 0;
  for (const prod of products) {
    if (prod.locationStock && Object.keys(prod.locationStock).length > 0) {
      const sumLocStock = Object.values(prod.locationStock).reduce((sum, q) => sum + (q || 0), 0);
      if (sumLocStock !== prod.quantity) {
        stockDiscrepancies++;
        items.push({
          id: 'stock_reconciliation',
          category: 'STOCK_INTEGRITY',
          severity: 'WARNING',
          message: `Product '${prod.name}' total quantity (${prod.quantity}) does not match sum of location quantities (${sumLocStock}).`,
          details: { productId: prod.id, total: prod.quantity, locationSum: sumLocStock },
        });
      }
    }
  }
  if (stockDiscrepancies === 0) {
    items.push({
      id: 'stock_reconciliation',
      category: 'STOCK_INTEGRITY',
      severity: 'HEALTHY',
      message: `Stock levels across all locations reconcile accurately with product totals.`,
    });
  }

  // 4. Transfer validity
  let orphanTransfers = 0;
  for (const trf of transfers) {
    const srcExists = locations.some((l) => l.id === trf.sourceLocationId);
    const destExists = locations.some((l) => l.id === trf.destinationLocationId);
    if (!srcExists || !destExists) {
      orphanTransfers++;
      items.push({
        id: 'stock_transfers_check',
        category: 'TRANSFERS',
        severity: 'WARNING',
        message: `Stock transfer #${trf.transferNumber} references a missing or deleted location.`,
      });
    }
  }
  if (orphanTransfers === 0) {
    items.push({
      id: 'stock_transfers_check',
      category: 'TRANSFERS',
      severity: 'HEALTHY',
      message: `All ${transfers.length} stock transfers reference valid locations.`,
    });
  }

  // 5. Staff assignments
  let invalidStaffMappings = 0;
  for (const s of staff) {
    if (s.assignedLocationIds && s.assignedLocationIds.length > 0) {
      for (const locId of s.assignedLocationIds) {
        if (!locations.some((l) => l.id === locId)) {
          invalidStaffMappings++;
          items.push({
            id: 'staff_locations_check',
            category: 'STAFF_MAPPING',
            severity: 'WARNING',
            message: `Staff '${s.fullName}' is assigned to non-existent location ID '${locId}'.`,
          });
        }
      }
    }
  }
  if (invalidStaffMappings === 0) {
    items.push({
      id: 'staff_locations_check',
      category: 'STAFF_MAPPING',
      severity: 'HEALTHY',
      message: `All staff location assignments point to valid active business locations.`,
    });
  }

  const criticalCount = items.filter((i) => i.severity === 'CRITICAL').length;
  const warningCount = items.filter((i) => i.severity === 'WARNING').length;
  const healthy = criticalCount === 0;
  const score = Math.max(0, 100 - criticalCount * 25 - warningCount * 10);

  return { healthy, score, items };
}
