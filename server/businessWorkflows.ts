/**
 * Server-Side Controlled Business Automation, Workflows & Operational Assistance Engine (Stage 4L)
 * Evidence-based, safe, deterministic operational workflows using Africa/Accra business time.
 * Strictly non-autonomous on financial/inventory mutations:
 * - Surfaces tasks, reminders, and alerts
 * - NEVER automatically creates purchases, modifies stock, changes prices, forgives debt, or cancels sales
 * - Fully idempotent and deduplicated
 */

import { db } from './db.js';
import { getAccraToday } from './date.js';
import type {
  BusinessTask,
  TaskStatus,
  TaskPriority,
  TaskSource,
  AutomationRules,
  OperationsCenterSummary,
  StaffPermissions,
} from '../src/types/index.js';

export interface WorkflowEvaluationResult {
  generatedCount: number;
  existingActiveCount: number;
  tasks: BusinessTask[];
  summary: OperationsCenterSummary;
}

export interface TaskFilter {
  status?: string;
  priority?: string;
  source?: string;
  assignedToId?: string;
  search?: string;
  overdue?: boolean;
}

/**
 * Evaluates operational conditions across authoritative systems and generates
 * idempotent, evidence-based tasks and notifications.
 * Safe & controlled: zero financial/inventory mutations.
 */
export function evaluateBusinessWorkflows(
  businessId: string,
  options?: { force?: boolean; triggeredBy?: string }
): WorkflowEvaluationResult {
  const rules = db.getAutomationRules(businessId);
  const existingTasks = db.getTasks(businessId);
  const todayAccra = getAccraToday();

  // Helper to check if a task with the exact dedupKey is currently active
  const isTaskActive = (dedupKey: string): boolean => {
    return existingTasks.some(
      (t) =>
        t.dedupKey === dedupKey &&
        (t.status === 'pending' || t.status === 'in_progress' || t.status === 'snoozed')
    );
  };

  const newTasks: BusinessTask[] = [];

  // =========================================================================
  // 1. INVENTORY DEMAND & RESTOCK WORKFLOWS (Stage 4G & 4K integration)
  // =========================================================================
  const products = db.getProducts(businessId);
  const activeSales = db.getSales(businessId).filter((s) => s.status !== 'Cancelled');

  // Calculate 30-day unit velocity for each product
  const productVelocity: Record<string, number> = {};
  for (const sale of activeSales) {
    if (sale.items && Array.isArray(sale.items)) {
      for (const item of sale.items) {
        productVelocity[item.productId] = (productVelocity[item.productId] || 0) + (item.quantity || 0);
      }
    }
  }

  for (const product of products) {
    if (product.isDeleted) continue;

    // Out of stock
    if (product.quantity === 0) {
      const dedupKey = `${businessId}:inv:out_of_stock:${product.id}`;
      if (!isTaskActive(dedupKey)) {
        const task = db.createTask({
          businessId,
          title: `Out of Stock: ${product.name}`,
          description: `Product "${product.name}" has reached 0 units in stock. Review inventory and initiate supplier restocking as appropriate.`,
          source: 'Inventory Intelligence',
          sourceEntityId: product.id,
          evidence: {
            metricLabel: 'Current Stock',
            currentValue: 0,
            threshold: product.minStockLevel,
            details: `Product catalog ID: ${product.id}. Reorder point: ${product.minStockLevel} units.`,
            sourceModule: 'Stage 4G Inventory Intelligence',
          },
          actionUrl: '/products',
          actionLabel: 'Restock in Inventory',
          status: 'pending',
          priority: 'critical',
          dueDate: todayAccra,
          dedupKey,
        });
        newTasks.push(task);

        if (rules.autoNotifyStaff) {
          db.createNotification({
            businessId,
            type: 'task_reminder',
            title: `Operational Task: ${product.name} Out of Stock`,
            message: `Restock task generated for "${product.name}". Current stock is 0.`,
            link: '/products',
          });
        }
      }
    }
    // Low stock at or below minimum threshold
    else if (rules.minStockRestockAlert && product.quantity <= product.minStockLevel) {
      const dedupKey = `${businessId}:inv:low_stock:${product.id}`;
      if (!isTaskActive(dedupKey)) {
        const task = db.createTask({
          businessId,
          title: `Low Stock Attention: ${product.name}`,
          description: `Product "${product.name}" has ${product.quantity} units remaining, at or below the minimum reorder threshold (${product.minStockLevel}).`,
          source: 'Inventory Intelligence',
          sourceEntityId: product.id,
          evidence: {
            metricLabel: 'Current Stock',
            currentValue: product.quantity,
            threshold: product.minStockLevel,
            details: `Current stock: ${product.quantity}, Shortfall: ${Math.max(0, product.minStockLevel - product.quantity)} units.`,
            sourceModule: 'Stage 4G Inventory Intelligence',
          },
          actionUrl: '/products',
          actionLabel: 'Review Inventory',
          status: 'pending',
          priority: 'high',
          dueDate: todayAccra,
          dedupKey,
        });
        newTasks.push(task);

        if (rules.autoNotifyStaff) {
          db.createNotification({
            businessId,
            type: 'task_reminder',
            title: `Operational Task: ${product.name} Low Stock`,
            message: `Low stock task generated for "${product.name}" (${product.quantity} remaining, min: ${product.minStockLevel}).`,
            link: '/products',
          });
        }
      }
    }
    // High velocity with low coverage days (< threshold days)
    else {
      const unitsSold = productVelocity[product.id] || 0;
      const avgDailySold = unitsSold / 30; // 30-day velocity
      if (avgDailySold > 0) {
        const coverageDays = product.quantity / avgDailySold;
        if (coverageDays <= rules.stockCoverageDaysThreshold) {
          const dedupKey = `${businessId}:inv:velocity_coverage:${product.id}`;
          if (!isTaskActive(dedupKey)) {
            const task = db.createTask({
              businessId,
              title: `Fast Mover Low Coverage: ${product.name}`,
              description: `Product "${product.name}" has an estimated ${coverageDays.toFixed(1)} days of stock coverage remaining based on recent sales velocity (${avgDailySold.toFixed(1)} units/day).`,
              source: 'Inventory Intelligence',
              sourceEntityId: product.id,
              evidence: {
                metricLabel: 'Days of Coverage',
                currentValue: `${coverageDays.toFixed(1)} days`,
                threshold: `${rules.stockCoverageDaysThreshold} days`,
                details: `Current stock: ${product.quantity} units, Daily velocity: ${avgDailySold.toFixed(1)} units/day.`,
                sourceModule: 'Stage 4K Forecasting & Demand Planning',
              },
              actionUrl: '/products',
              actionLabel: 'Plan Restock',
              status: 'pending',
              priority: 'high',
              dueDate: todayAccra,
              dedupKey,
            });
            newTasks.push(task);
          }
        }
      }
    }
  }

  // =========================================================================
  // 2. DEBT & RECEIVABLES COLLECTION WORKFLOWS (Stage 4D integration)
  // =========================================================================
  const customers = db.getCustomers(businessId);
  for (const customer of customers) {
    if (customer.currentDebt && customer.currentDebt > 0) {
      const dedupKey = `${businessId}:debt:collection:${customer.id}`;
      if (!isTaskActive(dedupKey)) {
        const isHighRisk = customer.currentDebt >= 200 || (customer.creditLimit && customer.currentDebt > customer.creditLimit);
        const task = db.createTask({
          businessId,
          title: `Receivable Follow-up: ${customer.name}`,
          description: `Customer "${customer.name}" has an outstanding receivable balance of GH₵ ${customer.currentDebt.toFixed(2)}. Review repayment status and follow up.`,
          source: 'Debt Management',
          sourceEntityId: customer.id,
          evidence: {
            metricLabel: 'Outstanding Debt',
            currentValue: `GH₵ ${customer.currentDebt.toFixed(2)}`,
            threshold: customer.creditLimit ? `Limit: GH₵ ${customer.creditLimit.toFixed(2)}` : 'N/A',
            details: `Phone: ${customer.phone || 'None provided'}, Debt status: ${customer.currentDebt > (customer.creditLimit || 0) ? 'Exceeds Credit Limit' : 'Outstanding'}.`,
            sourceModule: 'Stage 4D Debtor Management',
          },
          actionUrl: '/debtors',
          actionLabel: 'Open Debtor Profile',
          status: 'pending',
          priority: isHighRisk ? 'high' : 'normal',
          dueDate: todayAccra,
          dedupKey,
        });
        newTasks.push(task);

        if (rules.autoNotifyStaff && isHighRisk) {
          db.createNotification({
            businessId,
            type: 'task_reminder',
            title: `Operational Task: Debt Follow-up (${customer.name})`,
            message: `Collection follow-up task created for "${customer.name}" (Balance: GH₵ ${customer.currentDebt.toFixed(2)}).`,
            link: '/debtors',
          });
        }
      }
    }
  }

  // =========================================================================
  // 3. CUSTOMER RETENTION & RELATIONSHIP WORKFLOWS (Stage 4H integration)
  // =========================================================================
  for (const customer of customers) {
    // Flag high-value VIP customers with notable purchase volume
    if (customer.totalPurchases && customer.totalPurchases >= 500) {
      // Check last activity if available
      const lastDate = customer.lastPurchaseDate;
      let daysInactive = 0;
      if (lastDate) {
        const diffMs = new Date(todayAccra).getTime() - new Date(lastDate).getTime();
        daysInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      if (daysInactive >= rules.customerInactivityDaysThreshold) {
        const dedupKey = `${businessId}:cust:retention:${customer.id}`;
        if (!isTaskActive(dedupKey)) {
          const task = db.createTask({
            businessId,
            title: `VIP Customer Check-in: ${customer.name}`,
            description: `High-value customer "${customer.name}" (Cumulative spend: GH₵ ${customer.totalPurchases.toFixed(2)}) has been inactive for ${daysInactive} days. Consider personal outreach.`,
            source: 'Customer Intelligence',
            sourceEntityId: customer.id,
            evidence: {
              metricLabel: 'Inactivity Duration',
              currentValue: `${daysInactive} days`,
              threshold: `${rules.customerInactivityDaysThreshold} days`,
              details: `Cumulative purchases: GH₵ ${customer.totalPurchases.toFixed(2)}, Last active date: ${lastDate || 'Not recorded'}.`,
              sourceModule: 'Stage 4H Customer Intelligence',
            },
            actionUrl: '/customers',
            actionLabel: 'View Customer Profile',
            status: 'pending',
            priority: 'normal',
            dueDate: todayAccra,
            dedupKey,
          });
          newTasks.push(task);
        }
      }
    }
  }

  // =========================================================================
  // 4. EXPENSE TREND WORKFLOWS (Stage 4E & 4K integration)
  // =========================================================================
  const allExpenses = db.getExpenses(businessId);
  if (allExpenses.length > 0) {
    // Check for high-spending expense category
    const catTotals: Record<string, number> = {};
    for (const exp of allExpenses) {
      catTotals[exp.category] = (catTotals[exp.category] || 0) + exp.amount;
    }
    for (const [cat, total] of Object.entries(catTotals)) {
      if (total >= 500) {
        const dedupKey = `${businessId}:exp:review:${cat}`;
        if (!isTaskActive(dedupKey)) {
          const task = db.createTask({
            businessId,
            title: `Expense Category Review: ${cat}`,
            description: `Operating expenses in "${cat}" total GH₵ ${total.toFixed(2)}. Review category expenditures for optimization opportunities.`,
            source: 'Expense Intelligence',
            sourceEntityId: cat,
            evidence: {
              metricLabel: 'Category Expenditure',
              currentValue: `GH₵ ${total.toFixed(2)}`,
              details: `Category: ${cat}, Total active expense records: ${allExpenses.filter((e) => e.category === cat).length}.`,
              sourceModule: 'Stage 4E Expenses & Stage 4K Planning',
            },
            actionUrl: '/expenses',
            actionLabel: 'Review Expenses',
            status: 'pending',
            priority: 'normal',
            dueDate: todayAccra,
            dedupKey,
          });
          newTasks.push(task);
        }
      }
    }
  }

  // =========================================================================
  // 5. SCHEDULED PERIODIC REVIEW WORKFLOWS (Section 24, 25, 26)
  // =========================================================================
  if (rules.enableDailyReview) {
    const dedupKey = `${businessId}:scheduled:daily_review:${todayAccra}`;
    if (!isTaskActive(dedupKey)) {
      const task = db.createTask({
        businessId,
        title: `Daily Operations Review (${todayAccra})`,
        description: `Review end-of-day sales totals, verify cash and Mobile Money balances, and check unresolved inventory alerts.`,
        source: 'Scheduled Review',
        evidence: {
          metricLabel: 'Accra Business Date',
          currentValue: todayAccra,
          details: 'Standard scheduled end-of-day operational checkpoint.',
          sourceModule: 'Stage 4L Workflow Scheduler',
        },
        actionUrl: '/dashboard',
        actionLabel: 'Open Daily Summary',
        status: 'pending',
        priority: 'normal',
        dueDate: todayAccra,
        dedupKey,
      });
      newTasks.push(task);
    }
  }

  // =========================================================================
  // 6. LOYALTY, RETENTION & CUSTOMER GROWTH WORKFLOWS (Stage 4N integration)
  // =========================================================================
  const loyaltyConfig = db.getLoyaltyConfig(businessId);
  if (loyaltyConfig && loyaltyConfig.enabled) {
    // 6a. Pending Reward Redemption Approval
    const pendingRedemptions = db.getRedemptions(businessId).filter((r) => r.status === 'PENDING_APPROVAL');
    for (const r of pendingRedemptions) {
      const dedupKey = `${businessId}:loyalty:reward_pending:${r.id}`;
      if (!isTaskActive(dedupKey)) {
        const task = db.createTask({
          businessId,
          title: `Approve Reward: ${r.customerName || 'Customer'} (${r.pointsRedeemed} pts)`,
          description: `Reward redemption request for GH₵ ${r.monetaryValueGhs.toFixed(2)} (${r.pointsRedeemed} points, Code: ${r.code}) requires approval.`,
          source: 'Customer Intelligence',
          sourceEntityId: r.id,
          actionUrl: `/customers/${r.customerId}`,
          actionLabel: 'Review Reward in Loyalty',
          status: 'pending',
          priority: 'high',
          dedupKey,
        });
        newTasks.push(task);
      }
    }

    // 6b. VIP / High-Value Customer Inactivity Alert
    const allCustomers = db.getCustomers(businessId).filter((c) => !c.isDeleted);
    for (const cust of allCustomers) {
      const custSales = activeSales.filter((s) => s.customerId === cust.id);
      if (custSales.length === 0) continue;

      const totalSpend = custSales.reduce((sum, s) => sum + (s.total || 0), 0);
      const isVipOrHighValue = totalSpend >= 1500 || custSales.length >= 15;

      if (isVipOrHighValue) {
        const lastSale = custSales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        const lastDate = new Date(lastSale.createdAt.substring(0, 10));
        const today = new Date(todayAccra);
        const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays > 30) {
          const dedupKey = `${businessId}:loyalty:vip_inactive:${cust.id}`;
          if (!isTaskActive(dedupKey)) {
            const task = db.createTask({
              businessId,
              title: `VIP Inactivity Alert: ${cust.name}`,
              description: `VIP patron ${cust.name} has not made a purchase in ${diffDays} days. Initiate personal relationship touchpoint.`,
              source: 'Customer Intelligence',
              sourceEntityId: cust.id,
              actionUrl: `/customers/${cust.id}`,
              actionLabel: 'View Customer Profile',
              status: 'pending',
              priority: 'high',
              dedupKey,
            });
            newTasks.push(task);
          }
        }
      }
    }
  }

  // Reload tasks to compute exact summary
  const currentAllTasks = db.getTasks(businessId);
  const summary = getOperationsCenterSummary(businessId);

  return {
    generatedCount: newTasks.length,
    existingActiveCount: currentAllTasks.filter(
      (t) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'snoozed'
    ).length,
    tasks: currentAllTasks,
    summary,
  };
}

/**
 * Generates an executive Operations Center summary.
 */
export function getOperationsCenterSummary(
  businessId: string,
  user?: { id: string; role?: string; permissions?: StaffPermissions }
): OperationsCenterSummary {
  const tasks = db.getTasks(businessId);
  const rules = db.getAutomationRules(businessId);
  const todayAccra = getAccraToday();

  let totalPending = 0;
  let dueToday = 0;
  let overdue = 0;
  let critical = 0;
  let assignedToMe = 0;
  let completedCount = 0;
  let dismissedCount = 0;

  const bySource: Record<string, number> = {
    'Inventory Intelligence': 0,
    'Customer Intelligence': 0,
    'Debt Management': 0,
    'Expense Intelligence': 0,
    'Sales Intelligence': 0,
    'Forecasting': 0,
    'Manual': 0,
    'Scheduled Review': 0,
  };

  const byPriority: Record<string, number> = {
    low: 0,
    normal: 0,
    high: 0,
    critical: 0,
  };

  for (const task of tasks) {
    if (task.status === 'completed') {
      completedCount++;
    } else if (task.status === 'dismissed') {
      dismissedCount++;
    } else {
      // Active tasks (pending, in_progress, snoozed)
      totalPending++;

      if (task.priority) {
        byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
      }
      if (task.source) {
        bySource[task.source] = (bySource[task.source] || 0) + 1;
      }

      if (task.priority === 'critical') {
        critical++;
      }

      if (task.dueDate) {
        if (task.dueDate === todayAccra) {
          dueToday++;
        } else if (task.dueDate < todayAccra) {
          overdue++;
        }
      }

      if (user && task.assignedToId === user.id) {
        assignedToMe++;
      }
    }
  }

  // Sort recent active tasks by priority (critical first) then createdAt
  const priorityWeight: Record<TaskPriority, number> = {
    critical: 4,
    high: 3,
    normal: 2,
    low: 1,
  };

  const recentTasks = tasks
    .filter((t) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'snoozed')
    .sort((a, b) => {
      const weightDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 50);

  return {
    businessId,
    generatedAt: new Date().toISOString(),
    totalPending,
    dueToday,
    overdue,
    critical,
    assignedToMe,
    completedCount,
    dismissedCount,
    bySource,
    byPriority,
    recentTasks,
    rules,
  };
}

/**
 * Sanitizes a task for financial privacy (Section 37 & 56).
 * Staff without `financial_reports` or `expenses` have sensitive financial figures stripped.
 */
export function sanitizeTaskForFinancialPrivacy(
  task: BusinessTask,
  user?: { role?: string; permissions?: StaffPermissions }
): BusinessTask | null {
  if (!user || user.role === 'business_owner' || user.role === 'admin' || user.role === 'master_admin') {
    return task;
  }

  const perms = user.permissions;

  // If staff has no expense permission and task is from Expense Intelligence, hide it
  if (task.source === 'Expense Intelligence') {
    if (!perms?.expenses && !perms?.financial_reports) {
      return null;
    }
  }

  // If staff has no financial_reports permission, mask financial figures in evidence & description
  if (!perms?.financial_reports) {
    const sanitized: BusinessTask = { ...task };
    if (sanitized.source === 'Debt Management') {
      const parts = sanitized.title.split(': ');
      sanitized.title = `Receivable Follow-up: ${parts[1] || 'Customer'}`;
      sanitized.description = 'Review customer credit account and follow up on pending balance.';
    }

    if (sanitized.evidence) {
      const ev = { ...sanitized.evidence };
      if (typeof ev.currentValue === 'string' && ev.currentValue.includes('GH₵')) {
        ev.currentValue = undefined;
      }
      if (typeof ev.threshold === 'string' && ev.threshold.includes('GH₵')) {
        ev.threshold = undefined;
      }
      if (typeof ev.details === 'string') {
        ev.details = ev.details.replace(/GH₵\s*\d+(\.\d{2})?/g, '[Restricted]');
      }
      sanitized.evidence = ev;
    }
    return sanitized;
  }

  return task;
}
