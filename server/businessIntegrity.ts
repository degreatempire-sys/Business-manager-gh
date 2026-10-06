/**
 * BUSINESS DATA INTEGRITY & CLEANUP GUIDANCE (Stages 5V & 5W)
 * Read-only deterministic data integrity evaluation engine and cleanup guidance.
 * Detects pricing anomalies, duplicate SKUs, orphaned sales relationships,
 * and provides factual guidance without mutating business records.
 */

import { db } from './db.js';

export interface IntegrityFinding {
  checkName: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  recordType: string;
  recordId?: string;
  description: string;
  suggestedAction: string;
  guidanceStatus: 'REVIEW' | 'ACTION_RECOMMENDED' | 'INFORMATIONAL';
  whyItMatters: string;
  recommendedAction: string;
}

export interface IntegrityCheckResult {
  name: string;
  status: 'PASS' | 'WARNING' | 'CRITICAL';
  description: string;
}

export interface IntegrityReport {
  summary: {
    status: 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
    totalChecks: number;
    passedChecks: number;
    warningCount: number;
    criticalCount: number;
  };
  checks: IntegrityCheckResult[];
  findings: IntegrityFinding[];
  checkedAt: string;
}

export function runBusinessIntegrityCheck(businessId: string): IntegrityReport {
  const products = db.getProducts(businessId) || [];
  const customers = db.getCustomers(businessId) || [];
  const sales = db.getSales(businessId) || [];

  const findings: IntegrityFinding[] = [];
  const checks: IntegrityCheckResult[] = [];

  // Check 1: Product pricing and stock validity
  let check1Failed = false;
  for (const p of products) {
    if (p.sellingPrice < 0 || p.buyingPrice < 0 || p.quantity < 0) {
      check1Failed = true;
      findings.push({
        checkName: 'Product Stock & Pricing Validity',
        severity: 'CRITICAL',
        recordType: 'Product',
        recordId: p.id,
        description: `Product "${p.name || p.sku}" has negative price or negative stock quantity.`,
        suggestedAction: 'Review and update product pricing and inventory levels.',
        guidanceStatus: 'ACTION_RECOMMENDED',
        whyItMatters: 'Negative prices or inventory stock quantities violate basic product pricing rules and can distort inventory valuation and profitability reports.',
        recommendedAction: 'Review the product record, confirm stock quantity and pricing, and correct it manually through the normal product workflow.',
      });
    }
  }
  checks.push({
    name: 'Product Stock & Pricing Validity',
    status: check1Failed ? 'CRITICAL' : 'PASS',
    description: 'Verifies that all products have valid non-negative pricing and inventory quantities.',
  });

  // Check 2: Product missing required identifying info
  let check2Failed = false;
  for (const p of products) {
    if (!p.name || !p.sku) {
      check2Failed = true;
      findings.push({
        checkName: 'Product Identification Completeness',
        severity: 'WARNING',
        recordType: 'Product',
        recordId: p.id,
        description: `Product record is missing required name or SKU.`,
        suggestedAction: 'Update product record with complete name and SKU.',
        guidanceStatus: 'REVIEW',
        whyItMatters: 'Incomplete product identification (missing name or SKU) makes inventory tracking and POS checkout unreliable.',
        recommendedAction: 'Review the affected product and complete the missing information through the normal product workflow.',
      });
    }
  }
  checks.push({
    name: 'Product Identification Completeness',
    status: check2Failed ? 'WARNING' : 'PASS',
    description: 'Verifies that all products have required name and SKU values.',
  });

  // Check 3: Duplicate SKUs within tenant
  let check3Failed = false;
  const skuMap = new Map<string, string[]>();
  for (const p of products) {
    if (p.sku) {
      const list = skuMap.get(p.sku) || [];
      list.push(p.id);
      skuMap.set(p.sku, list);
    }
  }
  for (const [sku, ids] of skuMap.entries()) {
    if (ids.length > 1) {
      check3Failed = true;
      findings.push({
        checkName: 'Product SKU Uniqueness',
        severity: 'CRITICAL',
        recordType: 'Product',
        recordId: ids.join(', '),
        description: `Multiple product records share the duplicate SKU "${sku}".`,
        suggestedAction: 'Assign unique SKUs to distinct products.',
        guidanceStatus: 'ACTION_RECOMMENDED',
        whyItMatters: 'SKUs are expected to uniquely identify products within the business catalog to prevent inventory and sales confusion.',
        recommendedAction: 'Review products sharing the SKU, determine which SKU should remain unique, and correct manually through the existing product workflow.',
      });
    }
  }
  checks.push({
    name: 'Product SKU Uniqueness',
    status: check3Failed ? 'CRITICAL' : 'PASS',
    description: 'Verifies that product SKUs are unique within the business scope.',
  });

  // Check 4: Sales orphaned product or customer references
  let check4Failed = false;
  const prodIds = new Set(products.map((p) => p.id));
  const custIds = new Set(customers.map((c) => c.id));
  for (const s of sales) {
    if (s.customerId && !custIds.has(s.customerId)) {
      check4Failed = true;
      findings.push({
        checkName: 'Sales Customer Relationship Integrity',
        severity: 'WARNING',
        recordType: 'Sale',
        recordId: s.id,
        description: `Sale record references non-existent customer ID "${s.customerId}".`,
        suggestedAction: 'Verify customer association or update sale record.',
        guidanceStatus: 'REVIEW',
        whyItMatters: 'Orphaned sales customer references can impact customer history and audit trails.',
        recommendedAction: 'Review the affected sale record, confirm whether the referenced customer still exists, and investigate manually.',
      });
    }
    for (const item of s.items || []) {
      if (item.productId && !prodIds.has(item.productId)) {
        check4Failed = true;
        findings.push({
          checkName: 'Sales Product Relationship Integrity',
          severity: 'CRITICAL',
          recordType: 'Sale',
          recordId: s.id,
          description: `Sale item references non-existent product ID "${item.productId}".`,
          suggestedAction: 'Verify product catalog association for sale items.',
          guidanceStatus: 'ACTION_RECOMMENDED',
          whyItMatters: 'Orphaned sales product references can impact inventory audit trails and product performance reports.',
          recommendedAction: 'Review the affected sale record, confirm whether the referenced product still exists, and investigate manually.',
        });
      }
    }
  }
  checks.push({
    name: 'Sales Relationship Integrity',
    status: check4Failed ? 'CRITICAL' : 'PASS',
    description: 'Verifies that sales correctly reference existing products and customers.',
  });

  // Check 5: Sales negative totals
  let check5Failed = false;
  for (const s of sales) {
    if (s.total < 0) {
      check5Failed = true;
      findings.push({
        checkName: 'Sales Amount Validity',
        severity: 'CRITICAL',
        recordType: 'Sale',
        recordId: s.id,
        description: `Sale record has negative total amount (${s.total}).`,
        suggestedAction: 'Review transaction amount calculation.',
        guidanceStatus: 'ACTION_RECOMMENDED',
        whyItMatters: 'Transactions with negative total amounts indicate potential calculation errors or invalid transaction records.',
        recommendedAction: 'Review the affected transaction, compare stored information with the sale record, and investigate before making any manual correction.',
      });
    }
  }
  checks.push({
    name: 'Sales Amount Validity',
    status: check5Failed ? 'CRITICAL' : 'PASS',
    description: 'Verifies that all sales transactions have valid non-negative totals.',
  });

  // Summary aggregation
  const totalChecks = checks.length;
  const passedChecks = checks.filter((c) => c.status === 'PASS').length;
  const warningCount = findings.filter((f) => f.severity === 'WARNING').length;
  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;

  let status: 'HEALTHY' | 'ATTENTION' | 'CRITICAL' = 'HEALTHY';
  if (criticalCount > 0) {
    status = 'CRITICAL';
  } else if (warningCount > 0 || passedChecks < totalChecks) {
    status = 'ATTENTION';
  }

  return {
    summary: {
      status,
      totalChecks,
      passedChecks,
      warningCount,
      criticalCount,
    },
    checks,
    findings,
    checkedAt: new Date().toISOString(),
  };
}
