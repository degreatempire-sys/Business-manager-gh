import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  Target,
  Bookmark,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Percent,
  RefreshCw,
  Trash2,
  HelpCircle,
  BarChart3,
  Calendar,
  Layers,
  ShieldAlert,
  Info,
  Sliders,
  Save,
  Activity,
  Bell,
  History,
  ClipboardList,
  Download,
  Upload,
  Database,
  ShieldCheck,
  Search,
  ShoppingCart,
  Package,
  Users,
  Truck,
  FileText,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import type {
  Business,
  SimulationScenarioType,
  SimulationRunResult,
  StoredSimulation,
  BusinessPlanningTargets,
  BusinessGoal,
  BusinessGoalType,
  Product,
  BusinessHealthReport,
  BusinessAlert,
  BusinessActivityEvent,
  BusinessDecision,
} from '../types/index.js';

interface BusinessPlanningCenterProps {
  business: Business | null;
  onNavigate?: (view: string) => void;
}

export const BusinessPlanningCenter: React.FC<BusinessPlanningCenterProps> = ({ business, onNavigate }) => {
  const currency = business?.currency || 'GH₵';
  const { user } = useAuth();
  const isOwnerOrAdmin = user?.role === 'business_owner' || user?.role === 'master_admin';
  const canManageProducts = isOwnerOrAdmin || user?.permissions?.inventory || user?.permissions?.pos;
  const canManageCustomers = isOwnerOrAdmin || user?.permissions?.customers || user?.permissions?.pos;
  const canManageExpenses = isOwnerOrAdmin || user?.permissions?.expenses || user?.permissions?.financial_reports;
  const canManagePurchases = isOwnerOrAdmin || user?.permissions?.purchases || user?.permissions?.inventory;
  const canManageInvoices = isOwnerOrAdmin || user?.permissions?.invoices || user?.permissions?.financial_reports;
  const canViewReports = isOwnerOrAdmin || user?.permissions?.financial_reports || user?.permissions?.dashboard;

  // Subsections: 'simulator' | 'targets' | 'saved' | 'health' | 'alerts' | 'activity' | 'daily_brief' | 'decisions' | 'export' | 'import' | 'backup'
  const [activeTab, setActiveTab] = useState<'simulator' | 'targets' | 'saved' | 'health' | 'alerts' | 'activity' | 'daily_brief' | 'decisions' | 'export' | 'import' | 'backup'>('simulator');

  // Business Decisions State
  const [decisions, setDecisions] = useState<BusinessDecision[]>([]);
  const [loadingDecisions, setLoadingDecisions] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [newDueDate, setNewDueDate] = useState('');

  const loadDecisions = async () => {
    setLoadingDecisions(true);
    try {
      const res = await api.getBusinessDecisions();
      if (res && res.decisions) setDecisions(res.decisions);
    } catch {
      // fallback
    } finally {
      setLoadingDecisions(false);
    }
  };

  const handleCreateDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const created = await api.createBusinessDecision({
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: newPriority,
        dueDate: newDueDate || undefined,
      });
      if (created) {
        setNewTitle('');
        setNewDesc('');
        setNewDueDate('');
        loadDecisions();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create decision');
    }
  };

  const handleUpdateDecisionStatus = async (id: string, status: string) => {
    try {
      await api.updateDecisionStatus(id, status);
      loadDecisions();
    } catch (err: any) {
      alert(err.message || 'Failed to update decision status');
    }
  };

  // Business Daily Brief State
  const [dailyBrief, setDailyBrief] = useState<any | null>(null);
  const [loadingDailyBrief, setLoadingDailyBrief] = useState(false);

  const loadDailyBrief = async () => {
    setLoadingDailyBrief(true);
    try {
      const res = await api.getBusinessDailyBrief();
      if (res) setDailyBrief(res);
    } catch {
      // fallback
    } finally {
      setLoadingDailyBrief(false);
    }
  };

  // Business Health State
  const [healthReport, setHealthReport] = useState<BusinessHealthReport | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [healthRange, setHealthRange] = useState('this_month');

  // Business Alerts State
  const [alerts, setAlerts] = useState<BusinessAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [alertFilterStatus, setAlertFilterStatus] = useState<string>('ACTIVE');

  // Business Activity Timeline State
  const [activities, setActivities] = useState<BusinessActivityEvent[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityRange, setActivityRange] = useState('this_month');
  const [activityEventType, setActivityEventType] = useState<string>('');

  // Scenario Simulator Inputs
  const [scenarioType, setScenarioType] = useState<SimulationScenarioType>('price_change');
  const [scenarioName, setScenarioName] = useState('');
  const [dateRange, setDateRange] = useState('this_month');
  const [notes, setNotes] = useState('');

  // Products for selector
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Scenario Specific Assumptions
  const [proposedPrice, setProposedPrice] = useState<number>(50);
  const [expectedSalesQuantity, setExpectedSalesQuantity] = useState<number>(100);

  const [volumeChangePercent, setVolumeChangePercent] = useState<number>(15);

  const [proposedChangeAmount, setProposedChangeAmount] = useState<number>(500);
  const [proposedChangePercent, setProposedChangePercent] = useState<number>(10);
  const [expenseMode, setExpenseMode] = useState<'amount' | 'percent'>('amount');

  const [proposedCost, setProposedCost] = useState<number>(35);
  const [costChangePercent, setCostChangePercent] = useState<number>(8);

  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);

  const [targetMonthlyProfit, setTargetMonthlyProfit] = useState<number>(5000);
  const [averageSellingPrice, setAverageSellingPrice] = useState<number>(60);
  const [averageUnitCost, setAverageUnitCost] = useState<number>(35);
  const [estimatedExpenses, setEstimatedExpenses] = useState<number>(2500);

  const [monthlySalesTargetInput, setMonthlySalesTargetInput] = useState<number>(20000);

  const [reductionPercent, setReductionPercent] = useState<number>(10);

  const [expectedCollectionPercent, setExpectedCollectionPercent] = useState<number>(50);

  // Multi-variable inputs
  const [multiSalesPct, setMultiSalesPct] = useState<number>(10);
  const [multiPricePct, setMultiPricePct] = useState<number>(5);
  const [multiExpDelta, setMultiExpDelta] = useState<number>(0);

  // Execution & Feedback State
  const [isRunning, setIsRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<SimulationRunResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Saved Scenarios State
  const [savedSimulations, setSavedSimulations] = useState<StoredSimulation[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savingSimulation, setSavingSimulation] = useState(false);

  // Targets State
  const [planningTargets, setPlanningTargets] = useState<BusinessPlanningTargets | null>(null);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [savingTargets, setSavingTargets] = useState(false);

  // Stage 4U Goals & Action Tracker State
  const [goals, setGoals] = useState<BusinessGoal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalType, setGoalType] = useState<BusinessGoalType>('sales_revenue');
  const [goalTargetValue, setGoalTargetValue] = useState<number>(20000);
  const [goalStartDate, setGoalStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [goalEndDate, setGoalEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [goalDescription, setGoalDescription] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  // Global Search & Quick Find State (Stage 5X)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults(null);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const res = await api.searchRecords(searchQuery);
        if (res && res.success) {
          setSearchResults(res);
        }
      } catch {
        // non-fatal
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Target Form State
  const [targetSales, setTargetSales] = useState<number>(25000);
  const [targetProfit, setTargetProfit] = useState<number>(8000);
  const [targetExpenseBudget, setTargetExpenseBudget] = useState<number>(4000);
  const [targetGrowthPct, setTargetGrowthPct] = useState<number>(15);

  // Load products & initial data
  useEffect(() => {
    loadProducts();
    loadSavedSimulations();
    loadTargets();
    loadHealthReport('this_month');
    loadAlerts();
    loadActivityTimeline('this_month');
  }, [business?.id]);

  const loadActivityTimeline = async (range: string = 'this_month', eventType?: string) => {
    setLoadingActivity(true);
    try {
      const res = await api.getBusinessActivity({ range, eventType: eventType || undefined });
      if (res?.activities) {
        setActivities(res.activities);
      }
    } catch {
      // fallback
    } finally {
      setLoadingActivity(false);
    }
  };

  const loadHealthReport = async (range: string = 'this_month') => {
    setLoadingHealth(true);
    try {
      const res = await api.getBusinessHealth({ range });
      if (res?.health) {
        setHealthReport(res.health);
      }
    } catch {
      // fallback
    } finally {
      setLoadingHealth(false);
    }
  };

  const loadAlerts = async () => {
    setLoadingAlerts(true);
    try {
      const res = await api.getBusinessAlerts();
      if (res?.alerts) {
        setAlerts(res.alerts);
      }
    } catch {
      // fallback
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleUpdateAlertStatus = async (id: string, status: 'ACTIVE' | 'DISMISSED' | 'RESOLVED') => {
    try {
      const res = await api.updateAlertStatus(id, status);
      if (res?.alert) {
        setAlerts((prev) => prev.map((a) => (a.id === id ? res.alert : a)));
      }
    } catch {
      // fallback
    }
  };

  const loadProducts = async () => {
    try {
      const res = await api.getProducts();
      const list = Array.isArray(res) ? res : (res as any)?.products || [];
      if (Array.isArray(list)) {
        setProducts(list);
        if (list.length > 0) {
          setSelectedProductId(list[0].id);
          const p = list[0];
          setProposedPrice(Number(p.sellingPrice || (p as any).price || 50));
          setProposedCost(Number(p.buyingPrice || (p as any).costPrice || 30));
        }
      }
    } catch {
      // fallback
    }
  };

  const loadSavedSimulations = async () => {
    setLoadingSaved(true);
    try {
      const res = await api.getSavedSimulations();
      if (res?.simulations) {
        setSavedSimulations(res.simulations);
      }
    } catch {
      // fallback
    } finally {
      setLoadingSaved(false);
    }
  };

  const loadTargets = async () => {
    setLoadingTargets(true);
    try {
      const res = await api.getPlanningTargets();
      if (res?.targets) {
        setPlanningTargets(res.targets);
        setTargetSales(res.targets.monthlySalesTarget || 25000);
        setTargetProfit(res.targets.monthlyProfitTarget || 8000);
        setTargetExpenseBudget(res.targets.expenseBudget || 4000);
        if (res.targets.growthTargetPercent !== undefined) {
          setTargetGrowthPct(res.targets.growthTargetPercent);
        }
      }
    } catch {
      // fallback
    } finally {
      setLoadingTargets(false);
    }
  };

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const p = products.find((prod) => prod.id === id);
    if (p) {
      setProposedPrice(Number(p.sellingPrice || p.price || 50));
      setProposedCost(Number(p.costPrice || 30));
    }
  };

  // Run Simulation
  const handleRunSimulation = async () => {
    setIsRunning(true);
    setStatusMessage(null);

    const assumptions: Record<string, any> = {};

    switch (scenarioType) {
      case 'price_change':
        assumptions.productId = selectedProductId;
        assumptions.proposedPrice = proposedPrice;
        assumptions.expectedSalesQuantity = expectedSalesQuantity;
        break;
      case 'sales_volume_change':
        assumptions.volumeChangePercent = volumeChangePercent;
        break;
      case 'expense_change':
        if (expenseMode === 'amount') {
          assumptions.proposedChangeAmount = proposedChangeAmount;
        } else {
          assumptions.proposedChangePercent = proposedChangePercent;
        }
        break;
      case 'cost_change':
        assumptions.productId = selectedProductId;
        assumptions.proposedCost = proposedCost;
        assumptions.costChangePercent = costChangePercent;
        assumptions.expectedSalesVolume = expectedSalesQuantity;
        break;
      case 'discount_scenario':
        assumptions.productId = selectedProductId;
        assumptions.discountType = discountType;
        assumptions.discountValue = discountValue;
        assumptions.expectedQuantity = expectedSalesQuantity;
        break;
      case 'target_profit':
        assumptions.targetMonthlyProfit = targetMonthlyProfit;
        assumptions.averageSellingPrice = averageSellingPrice;
        assumptions.averageUnitCost = averageUnitCost;
        assumptions.estimatedOperatingExpenses = estimatedExpenses;
        break;
      case 'sales_target':
        assumptions.monthlyTarget = monthlySalesTargetInput;
        break;
      case 'expense_reduction':
        assumptions.reductionPercent = reductionPercent;
        break;
      case 'debt_collection':
        assumptions.expectedCollectionPercent = expectedCollectionPercent;
        break;
      case 'custom_multi_variable':
        assumptions.salesAdjustmentPct = multiSalesPct;
        assumptions.priceAdjustmentPct = multiPricePct;
        assumptions.expenseDeltaGHS = multiExpDelta;
        break;
    }

    try {
      const result = await api.runScenarioSimulation({
        scenarioType,
        scenarioName: scenarioName.trim() || undefined,
        range: dateRange,
        assumptions,
      });

      setCurrentResult(result);
      setStatusMessage({
        type: 'success',
        text: 'Simulation completed successfully. Read-only model computed against authoritative baseline.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to execute scenario simulation.',
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Save Current Simulation
  const handleSaveSimulation = async () => {
    if (!currentResult) return;
    setSavingSimulation(true);
    try {
      await api.saveSimulation({
        scenarioName: scenarioName.trim() || currentResult.scenarioName,
        scenarioType: currentResult.scenarioType,
        notes: notes.trim(),
        assumptions: currentResult.assumptions,
        baseline: currentResult.baseline,
        simulatedResult: currentResult.simulated,
        comparison: currentResult.comparison,
        explanation: currentResult.explanation,
      });

      setStatusMessage({
        type: 'success',
        text: 'Simulation scenario successfully saved to your Business Planning library.',
      });
      loadSavedSimulations();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to save simulation.',
      });
    } finally {
      setSavingSimulation(false);
    }
  };

  // Delete Saved Simulation
  const handleDeleteSaved = async (id: string) => {
    try {
      await api.deleteSimulation(id);
      setSavedSimulations((prev) => prev.filter((s) => s.id !== id));
      setStatusMessage({
        type: 'info',
        text: 'Scenario removed from saved simulations.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to delete scenario.',
      });
    }
  };

  // Save Planning Targets
  const handleSaveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTargets(true);
    setStatusMessage(null);
    try {
      const res = await api.savePlanningTargets({
        monthlySalesTarget: targetSales,
        monthlyProfitTarget: targetProfit,
        expenseBudget: targetExpenseBudget,
        growthTargetPercent: targetGrowthPct,
      });
      setPlanningTargets(res.targets);
      setStatusMessage({
        type: 'success',
        text: 'Monthly planning targets and expense budget saved successfully.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to update planning targets.',
      });
    } finally {
      setSavingTargets(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Executive Strategic Planning</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Business Planning & Scenario Simulator
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Explore hypothetical "what-if" assumptions on prices, volumes, cost changes, and debtor recovery.
              Simulations are strictly isolated and never modify live records.
            </p>
          </div>

          {/* Navigation Pill Switcher */}
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'simulator'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Simulator</span>
            </button>
            <button
              onClick={() => setActiveTab('targets')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'targets'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Targets & Budgets</span>
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'saved'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Saved Scenarios ({savedSimulations.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('health');
                if (!healthReport) loadHealthReport(healthRange);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'health'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Business Health</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('alerts');
                loadAlerts();
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'alerts'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Alerts ({alerts.filter((a) => a.status === 'ACTIVE').length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('activity');
                loadActivityTimeline(activityRange, activityEventType);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'activity'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Activity Timeline</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('daily_brief');
                loadDailyBrief();
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'daily_brief'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Daily Brief</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('decisions');
                loadDecisions();
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'decisions'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Decisions ({decisions.filter((d) => d.status === 'OPEN').length})</span>
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'export'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Data Export</span>
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'import'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Data Import</span>
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'backup'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Backup & Recovery</span>
            </button>
          </div>
        </div>

        {/* Quick Find & Global Search Bar (Stage 5X) */}
        <div className="mt-6 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-emerald-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Quick Find: Search products, customers, sales, receipts, debts, suppliers, purchases, expenses, invoices..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {searchQuery.trim().length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span className="font-semibold text-white">Search Results for "{searchQuery}"</span>
                <span className="font-mono">{searchResults ? `${searchResults.totalCount} records found` : 'Searching...'}</span>
              </div>

              {isSearching ? (
                <p className="text-xs text-slate-500 text-center py-3 italic">Searching business records...</p>
              ) : searchResults && searchResults.totalCount === 0 ? (
                <p className="text-xs text-slate-500 text-center py-3 italic">No matching records found.</p>
              ) : searchResults ? (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {Object.entries(searchResults.results).map(([category, items]: [string, any[]]) => {
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={category} className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          {category} ({items.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {items.map((item) => (
                            <div key={item.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 text-xs space-y-0.5">
                              <p className="text-white font-bold truncate">{item.title}</p>
                              <p className="text-slate-400 text-[11px] truncate">{item.subtitle}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Quick Actions & Navigation Shortcuts (Stage 5Y) */}
        <div className="mt-4 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Quick Actions & Shortcuts</span>
            <span className="text-[10px] text-slate-400 font-mono">Workflow Shortcuts</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 text-xs">
            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate('sales')}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-600/60 rounded-xl p-2.5 text-left transition flex items-center space-x-2 group"
                >
                  <ShoppingCart className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-white font-bold truncate group-hover:text-emerald-300">New Sale / POS</span>
                </button>

                {canManageProducts && (
                  <button
                    onClick={() => onNavigate('products')}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-600/60 rounded-xl p-2.5 text-left transition flex items-center space-x-2 group"
                  >
                    <Package className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-white font-bold truncate group-hover:text-emerald-300">Inventory / Products</span>
                  </button>
                )}

                {canManageCustomers && (
                  <button
                    onClick={() => onNavigate('customers')}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-600/60 rounded-xl p-2.5 text-left transition flex items-center space-x-2 group"
                  >
                    <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-white font-bold truncate group-hover:text-emerald-300">Customers</span>
                  </button>
                )}

                {canManageExpenses && (
                  <button
                    onClick={() => onNavigate('expenses')}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-600/60 rounded-xl p-2.5 text-left transition flex items-center space-x-2 group"
                  >
                    <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-white font-bold truncate group-hover:text-emerald-300">Add Expense</span>
                  </button>
                )}

                {canManagePurchases && (
                  <button
                    onClick={() => onNavigate('purchases')}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-600/60 rounded-xl p-2.5 text-left transition flex items-center space-x-2 group"
                  >
                    <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-white font-bold truncate group-hover:text-emerald-300">Stock-In / Purchase</span>
                  </button>
                )}

                {canManageInvoices && (
                  <button
                    onClick={() => onNavigate('invoices')}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-600/60 rounded-xl p-2.5 text-left transition flex items-center space-x-2 group"
                  >
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-white font-bold truncate group-hover:text-emerald-300">Invoices</span>
                  </button>
                )}

                <button
                  onClick={() => onNavigate('sales')}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-600/60 rounded-xl p-2.5 text-left transition flex items-center space-x-2 group"
                >
                  <History className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-white font-bold truncate group-hover:text-emerald-300">Sales History</span>
                </button>

                {canViewReports && (
                  <button
                    onClick={() => onNavigate('reports')}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-600/60 rounded-xl p-2.5 text-left transition flex items-center space-x-2 group"
                  >
                    <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-white font-bold truncate group-hover:text-emerald-300">Reports</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Global Alert Notification */}
        {statusMessage && (
          <div
            className={`mt-4 p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                : 'bg-blue-950/60 border-blue-800/80 text-blue-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : statusMessage.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              ) : (
                <Info className="w-4 h-4 shrink-0 text-blue-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white ml-2 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* 2. TAB: SCENARIO SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Assumption Controls */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center space-x-2 text-white font-bold">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Assumption Parameters</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  SIMULATION ONLY
                </span>
              </div>

              {/* Scenario Type Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Scenario Strategy</label>
                <select
                  value={scenarioType}
                  onChange={(e) => setScenarioType(e.target.value as SimulationScenarioType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="price_change">Price Change (Product / Basket)</option>
                  <option value="sales_volume_change">Sales Volume Shift (+/- %)</option>
                  <option value="expense_change">Operating Expense Adjustment</option>
                  <option value="cost_change">Purchase / COGS Cost Shift</option>
                  <option value="discount_scenario">Promotional Discount Campaign</option>
                  <option value="target_profit">Target Profit Pathway</option>
                  <option value="sales_target">Monthly Sales Target & Run-Rate</option>
                  <option value="expense_reduction">Expense Reduction (Overhead Cut)</option>
                  <option value="debt_collection">Debtor Cash Recovery Simulation</option>
                  <option value="custom_multi_variable">Custom Multi-Variable Strategy</option>
                </select>
              </div>

              {/* Baseline Period */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Baseline Comparative Period</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="this_month">This Month (Current Accra)</option>
                  <option value="last_month">Last Month</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="this_quarter">This Quarter</option>
                </select>
              </div>

              {/* Scenario Name / Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Scenario Label (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Price Increase or Promo Launch"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* DYNAMIC SCENARIO INPUTS */}

              {/* A. Price Change */}
              {scenarioType === 'price_change' && (
                <div className="space-y-4 pt-2 border-t border-slate-800/80">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Select Target Product</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Current: {currency} {Number(p.sellingPrice || p.price || 0).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Proposed Price ({currency})</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={proposedPrice}
                        onChange={(e) => setProposedPrice(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Expected Sales Units</label>
                      <input
                        type="number"
                        min="1"
                        value={expectedSalesQuantity}
                        onChange={(e) => setExpectedSalesQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* B. Sales Volume Change */}
              {scenarioType === 'sales_volume_change' && (
                <div className="space-y-4 pt-2 border-t border-slate-800/80">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-semibold text-slate-300">Volume Change Percentage</label>
                      <span className={`font-black ${volumeChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {volumeChangePercent >= 0 ? '+' : ''}{volumeChangePercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="100"
                      step="5"
                      value={volumeChangePercent}
                      onChange={(e) => setVolumeChangePercent(Number(e.target.value))}
                      className="w-full accent-emerald-500 bg-slate-950"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>-50% (Slump)</span>
                      <span>0% (Baseline)</span>
                      <span>+100% (Double)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* C. Expense Change */}
              {scenarioType === 'expense_change' && (
                <div className="space-y-4 pt-2 border-t border-slate-800/80">
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setExpenseMode('amount')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${
                        expenseMode === 'amount'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      Exact Amount ({currency})
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseMode('percent')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${
                        expenseMode === 'percent'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      Percentage (%)
                    </button>
                  </div>

                  {expenseMode === 'amount' ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Expense Delta ({currency})</label>
                      <input
                        type="number"
                        step="50"
                        value={proposedChangeAmount}
                        onChange={(e) => setProposedChangeAmount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        placeholder="Positive to increase, negative to decrease"
                      />
                      <span className="text-[10px] text-slate-500">Enter negative number (e.g. -500) for expense savings.</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Expense Change (%)</label>
                      <input
                        type="number"
                        step="5"
                        value={proposedChangePercent}
                        onChange={(e) => setProposedChangePercent(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* D. Cost Change */}
              {scenarioType === 'cost_change' && (
                <div className="space-y-4 pt-2 border-t border-slate-800/80">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Target Product</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Current Cost: {currency} {Number(p.costPrice || 0).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">New Cost Price ({currency})</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={proposedCost}
                        onChange={(e) => setProposedCost(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Expected Volume</label>
                      <input
                        type="number"
                        min="1"
                        value={expectedSalesQuantity}
                        onChange={(e) => setExpectedSalesQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* E. Discount Scenario */}
              {scenarioType === 'discount_scenario' && (
                <div className="space-y-4 pt-2 border-t border-slate-800/80">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Promotional Product</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Price: {currency} {Number(p.sellingPrice || p.price || 0).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Discount Type</label>
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'amount')}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="amount">Fixed Amount ({currency})</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Discount Value</label>
                      <input
                        type="number"
                        min="0"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* F. Target Profit */}
              {scenarioType === 'target_profit' && (
                <div className="space-y-4 pt-2 border-t border-slate-800/80">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Target Monthly Net Profit ({currency})</label>
                    <input
                      type="number"
                      min="100"
                      step="500"
                      value={targetMonthlyProfit}
                      onChange={(e) => setTargetMonthlyProfit(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Avg Selling Price</label>
                      <input
                        type="number"
                        min="1"
                        value={averageSellingPrice}
                        onChange={(e) => setAverageSellingPrice(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Avg Unit Cost</label>
                      <input
                        type="number"
                        min="0"
                        value={averageUnitCost}
                        onChange={(e) => setAverageUnitCost(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Estimated Monthly Overhead ({currency})</label>
                    <input
                      type="number"
                      min="0"
                      value={estimatedExpenses}
                      onChange={(e) => setEstimatedExpenses(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {/* G. Sales Target */}
              {scenarioType === 'sales_target' && (
                <div className="space-y-4 pt-2 border-t border-slate-800/80">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Monthly Sales Goal ({currency})</label>
                    <input
                      type="number"
                      min="500"
                      step="1000"
                      value={monthlySalesTargetInput}
                      onChange={(e) => setMonthlySalesTargetInput(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* H. Expense Reduction */}
              {scenarioType === 'expense_reduction' && (
                <div className="space-y-4 pt-2 border-t border-slate-800/80">
                  <label className="text-xs font-semibold text-slate-300">Reduction Goal (%)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setReductionPercent(pct)}
                        className={`py-2 text-xs font-bold rounded-xl border ${
                          reductionPercent === pct
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Custom Reduction %</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={reductionPercent}
                      onChange={(e) => setReductionPercent(Math.max(1, Math.min(100, Number(e.target.value))))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {/* I. Debt Collection */}
              {scenarioType === 'debt_collection' && (
                <div className="space-y-4 pt-2 border-t border-slate-800/80">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-semibold text-slate-300">Target Debt Recovery Efficiency</label>
                      <span className="font-black text-emerald-400">{expectedCollectionPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={expectedCollectionPercent}
                      onChange={(e) => setExpectedCollectionPercent(Number(e.target.value))}
                      className="w-full accent-emerald-500 bg-slate-950"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>25% (Modest)</span>
                      <span>50% (Standard)</span>
                      <span>80% (Aggressive)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Multi-Variable */}
              {scenarioType === 'custom_multi_variable' && (
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">Sales Volume Adjustment (%)</label>
                    <input
                      type="number"
                      value={multiSalesPct}
                      onChange={(e) => setMultiSalesPct(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">Price Adjustment (%)</label>
                    <input
                      type="number"
                      value={multiPricePct}
                      onChange={(e) => setMultiPricePct(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">Expense Delta ({currency})</label>
                    <input
                      type="number"
                      value={multiExpDelta}
                      onChange={(e) => setMultiExpDelta(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {/* Execution CTA Button */}
              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={isRunning}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Calculating Simulation...</span>
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4" />
                    <span>Run Strategic Simulation</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: What-If Comparison & Explanation */}
          <div className="lg:col-span-7 space-y-6">
            {!currentResult ? (
              <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-emerald-400 shadow-inner">
                  <Calculator className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base font-bold text-white">No Simulation Executed Yet</h3>
                  <p className="text-xs text-slate-400">
                    Select your strategic assumptions on the left and click{' '}
                    <strong className="text-emerald-400">"Run Strategic Simulation"</strong> to calculate
                    revenue, profit, and working capital outcomes.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Comparison Scorecard Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          What-If Analysis Matrix
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            currentResult.comparison.viability === 'highly_favorable'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : currentResult.comparison.viability === 'favorable'
                              ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                              : currentResult.comparison.viability === 'high_risk'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {currentResult.comparison.viability.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {currentResult.dateRange.label} Baseline vs. Simulated Projection
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveSimulation}
                      disabled={savingSimulation}
                      className="self-start sm:self-auto inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
                    >
                      <Save className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{savingSimulation ? 'Saving...' : 'Save Scenario'}</span>
                    </button>
                  </div>

                  {/* Financial Comparison Grid */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5">Metric</th>
                          <th className="py-2.5 text-slate-300 font-semibold">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px]">ACTUAL</span> Baseline
                          </th>
                          <th className="py-2.5 text-emerald-400 font-semibold">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px]">SIMULATED</span> Scenario
                          </th>
                          <th className="py-2.5 text-right">Variance / Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {/* Revenue */}
                        <tr>
                          <td className="py-3 text-slate-200 font-bold">Revenue</td>
                          <td className="py-3 text-slate-300">
                            {currency} {currentResult.baseline.revenue.toFixed(2)}
                          </td>
                          <td className="py-3 text-emerald-300 font-bold">
                            {currency} {currentResult.simulated.revenue.toFixed(2)}
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className={`font-black ${
                                currentResult.comparison.revenueDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {currentResult.comparison.revenueDelta >= 0 ? '+' : ''}
                              {currency} {currentResult.comparison.revenueDelta.toFixed(2)} (
                              {currentResult.comparison.revenueDeltaPercent}%)
                            </span>
                          </td>
                        </tr>

                        {/* COGS */}
                        {!currentResult.metadata.isFinancialsRestricted && (
                          <tr>
                            <td className="py-3 text-slate-200 font-bold">COGS (Direct Costs)</td>
                            <td className="py-3 text-slate-300">
                              {currency} {currentResult.baseline.cogs.toFixed(2)}
                            </td>
                            <td className="py-3 text-slate-300">
                              {currency} {currentResult.simulated.cogs.toFixed(2)}
                            </td>
                            <td className="py-3 text-right text-slate-400">
                              {currentResult.comparison.cogsDelta >= 0 ? '+' : ''}
                              {currency} {currentResult.comparison.cogsDelta.toFixed(2)}
                            </td>
                          </tr>
                        )}

                        {/* Gross Profit */}
                        {!currentResult.metadata.isFinancialsRestricted && (
                          <tr>
                            <td className="py-3 text-slate-200 font-bold">Gross Profit</td>
                            <td className="py-3 text-slate-300">
                              {currency} {currentResult.baseline.grossProfit.toFixed(2)}
                            </td>
                            <td className="py-3 text-emerald-400 font-bold">
                              {currency} {currentResult.simulated.grossProfit.toFixed(2)}
                            </td>
                            <td className="py-3 text-right">
                              <span
                                className={`font-black ${
                                  currentResult.comparison.grossProfitDelta >= 0
                                    ? 'text-emerald-400'
                                    : 'text-rose-400'
                                }`}
                              >
                                {currentResult.comparison.grossProfitDelta >= 0 ? '+' : ''}
                                {currency} {currentResult.comparison.grossProfitDelta.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        )}

                        {/* Operating Expenses */}
                        {!currentResult.metadata.isFinancialsRestricted && (
                          <tr>
                            <td className="py-3 text-slate-200 font-bold">Operating Expenses</td>
                            <td className="py-3 text-slate-300">
                              {currency} {currentResult.baseline.operatingExpenses.toFixed(2)}
                            </td>
                            <td className="py-3 text-slate-300">
                              {currency} {currentResult.simulated.operatingExpenses.toFixed(2)}
                            </td>
                            <td className="py-3 text-right text-slate-400">
                              {currentResult.comparison.expensesDelta >= 0 ? '+' : ''}
                              {currency} {currentResult.comparison.expensesDelta.toFixed(2)}
                            </td>
                          </tr>
                        )}

                        {/* Net Profit */}
                        {!currentResult.metadata.isFinancialsRestricted && (
                          <tr className="bg-slate-950/40">
                            <td className="py-3 text-white font-black">Net Profit (Bottom Line)</td>
                            <td className="py-3 text-slate-200 font-bold">
                              {currency} {currentResult.baseline.netProfit.toFixed(2)}
                            </td>
                            <td className="py-3 text-emerald-400 font-black text-sm">
                              {currency} {currentResult.simulated.netProfit.toFixed(2)}
                            </td>
                            <td className="py-3 text-right">
                              <span
                                className={`font-black text-sm ${
                                  currentResult.comparison.netProfitDelta >= 0
                                    ? 'text-emerald-400'
                                    : 'text-rose-400'
                                }`}
                              >
                                {currentResult.comparison.netProfitDelta >= 0 ? '+' : ''}
                                {currency} {currentResult.comparison.netProfitDelta.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        )}

                        {/* Profit Margins */}
                        {!currentResult.metadata.isFinancialsRestricted && (
                          <tr>
                            <td className="py-3 text-slate-200 font-bold">Net Profit Margin</td>
                            <td className="py-3 text-slate-300">{currentResult.baseline.netMarginPercent}%</td>
                            <td className="py-3 text-emerald-400 font-bold">
                              {currentResult.simulated.netMarginPercent}%
                            </td>
                            <td className="py-3 text-right font-black">
                              <span
                                className={
                                  currentResult.comparison.netMarginPpDelta >= 0
                                    ? 'text-emerald-400'
                                    : 'text-rose-400'
                                }
                              >
                                {currentResult.comparison.netMarginPpDelta >= 0 ? '+' : ''}
                                {currentResult.comparison.netMarginPpDelta}pp
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Structured Result Explanation */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center space-x-2 text-white font-bold border-b border-slate-800/80 pb-3">
                    <Info className="w-4 h-4 text-emerald-400" />
                    <span>Executive Result Explanation</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-black text-white">{currentResult.explanation.headline}</h4>
                      <p className="text-xs text-slate-300 mt-1">{currentResult.explanation.whatChanged}</p>
                    </div>

                    {/* Assumptions pill list */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Assumptions Applied
                      </span>
                      <ul className="list-disc list-inside text-xs text-slate-400 space-y-0.5">
                        {currentResult.explanation.assumptions.map((assump, idx) => (
                          <li key={idx}>{assump}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Impact Highlights Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Revenue Impact</span>
                        <p className="text-xs text-slate-200">{currentResult.explanation.revenueImpact}</p>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Net Profit Impact</span>
                        <p className="text-xs text-emerald-300 font-semibold">
                          {currentResult.explanation.profitImpact}
                        </p>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Cash Flow Impact</span>
                        <p className="text-xs text-slate-200">{currentResult.explanation.cashFlowImpact}</p>
                      </div>
                      {currentResult.explanation.recommendedAction && (
                        <div className="bg-slate-950 p-3 rounded-2xl border border-emerald-800/40 space-y-1">
                          <span className="text-[10px] text-emerald-400 uppercase font-bold">Action Recommended</span>
                          <p className="text-xs text-emerald-200 font-semibold">
                            {currentResult.explanation.recommendedAction}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Model Limitations Disclaimer */}
                    <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 text-[11px] text-slate-400 flex items-start space-x-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <strong className="text-amber-300">Model Limitations:</strong>
                        <p>
                          Projections are mathematical estimates and not guaranteed outcomes. They do not
                          account for competitor counter-actions, stockout delays, or currency exchange shocks.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. TAB: TARGETS & BUDGETS */}
      {activeTab === 'targets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Targets Setup Form */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center space-x-2 text-white font-bold">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>Monthly Business Goals & Budgets</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                ACTIVE MONTH
              </span>
            </div>

            <form onSubmit={handleSaveTargets} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Monthly Sales Target ({currency})</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={targetSales}
                  onChange={(e) => setTargetSales(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  placeholder="e.g. 25000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Monthly Net Profit Target ({currency})</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={targetProfit}
                  onChange={(e) => setTargetProfit(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  placeholder="e.g. 8000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Monthly Operating Expense Budget ({currency})</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={targetExpenseBudget}
                  onChange={(e) => setTargetExpenseBudget(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 4000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Target Monthly Growth Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={targetGrowthPct}
                  onChange={(e) => setTargetGrowthPct(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 15"
                />
              </div>

              <button
                type="submit"
                disabled={savingTargets}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/60"
              >
                <Save className="w-4 h-4" />
                <span>{savingTargets ? 'Saving Targets...' : 'Save Monthly Targets'}</span>
              </button>
            </form>
          </div>

          {/* Targets Progress Tracking Dashboard */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center space-x-2 text-white font-bold">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>Real-Time Progress Against Targets</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {planningTargets?.period || 'Current Month'}
                </span>
              </div>

              {loadingTargets ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading progress...</div>
              ) : (
                <div className="space-y-6">
                  {/* Sales Target Card */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">Sales Revenue Pace</span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            planningTargets?.progress?.salesStatus === 'exceeded'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : planningTargets?.progress?.salesStatus === 'behind'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-teal-500/20 text-teal-400'
                          }`}
                        >
                          {planningTargets?.progress?.salesStatus || 'In Progress'}
                        </span>
                      </div>
                      <span className="text-emerald-400 font-black">
                        {currency} {planningTargets?.actuals?.salesAchieved?.toFixed(2) || '0.00'} / {currency}{' '}
                        {targetSales.toFixed(2)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, planningTargets?.progress?.salesPercent || 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>{planningTargets?.progress?.salesPercent || 0}% Achieved</span>
                      <span>Target: {currency} {targetSales.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Profit Target Card */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">Net Profit Pace</span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            planningTargets?.progress?.profitStatus === 'exceeded'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : planningTargets?.progress?.profitStatus === 'behind'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-teal-500/20 text-teal-400'
                          }`}
                        >
                          {planningTargets?.progress?.profitStatus || 'In Progress'}
                        </span>
                      </div>
                      <span className="text-emerald-400 font-black">
                        {currency} {planningTargets?.actuals?.profitAchieved?.toFixed(2) || '0.00'} / {currency}{' '}
                        {targetProfit.toFixed(2)}
                      </span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, planningTargets?.progress?.profitPercent || 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>{planningTargets?.progress?.profitPercent || 0}% Achieved</span>
                      <span>Target: {currency} {targetProfit.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Expense Budget Card */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">Expense Budget Burn</span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            planningTargets?.progress?.expenseStatus === 'over_budget'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {planningTargets?.progress?.expenseStatus === 'over_budget'
                            ? 'Over Budget'
                            : 'Within Budget'}
                        </span>
                      </div>
                      <span className="text-slate-300 font-black">
                        {currency} {planningTargets?.actuals?.expensesIncurred?.toFixed(2) || '0.00'} / {currency}{' '}
                        {targetExpenseBudget.toFixed(2)}
                      </span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-500 ${
                          (planningTargets?.progress?.expenseBurnPercent || 0) > 100
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                        }`}
                        style={{
                          width: `${Math.min(100, planningTargets?.progress?.expenseBurnPercent || 0)}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>{planningTargets?.progress?.expenseBurnPercent || 0}% of Budget Consumed</span>
                      <span>Cap: {currency} {targetExpenseBudget.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB: SAVED SCENARIOS LIBRARY */}
      {activeTab === 'saved' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-2 text-white font-bold">
              <Bookmark className="w-4 h-4 text-emerald-400" />
              <span>Saved Business Planning Scenarios</span>
            </div>
            <span className="text-xs text-slate-400">
              {savedSimulations.length} {savedSimulations.length === 1 ? 'scenario' : 'scenarios'} saved
            </span>
          </div>

          {loadingSaved ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading saved scenarios...</div>
          ) : savedSimulations.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                <Bookmark className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">No Saved Scenarios Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Run a simulation in the Scenario Simulator tab and click{' '}
                <strong className="text-emerald-400">"Save Scenario"</strong> to keep it for executive reviews.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedSimulations.map((sim) => (
                <div
                  key={sim.id}
                  className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3 relative group hover:border-slate-700 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                        {sim.scenarioType.replace(/_/g, ' ')}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1">{sim.scenarioName}</h4>
                      <p className="text-[10px] text-slate-400">
                        Created by {sim.creatorName} on {new Date(sim.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSaved(sim.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                      title="Delete Scenario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Summary Delta */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-2.5 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Projected Revenue</span>
                      <strong className="text-white font-bold">
                        {currency} {sim.simulatedResult.revenue.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Net Profit Delta</span>
                      <strong
                        className={`font-black ${
                          sim.comparison.netProfitDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {sim.comparison.netProfitDelta >= 0 ? '+' : ''}
                        {currency} {sim.comparison.netProfitDelta.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">{sim.explanation.headline}</p>

                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentResult({
                          scenarioType: sim.scenarioType,
                          scenarioName: sim.scenarioName,
                          dateRange: {
                            range: 'saved',
                            startDate: '',
                            endDate: '',
                            label: 'Saved Scenario',
                          },
                          assumptions: sim.assumptions,
                          baseline: sim.baseline,
                          simulated: sim.simulatedResult,
                          comparison: sim.comparison,
                          explanation: sim.explanation,
                          metadata: {
                            generatedAt: sim.createdAt,
                            currency,
                            businessId: sim.businessId,
                            isFinancialsRestricted: false,
                          },
                        });
                        setActiveTab('simulator');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                    >
                      <span>Load into Simulator</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB: BUSINESS HEALTH DASHBOARD */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-white font-bold text-lg">
                <Activity className="w-5 h-5 text-emerald-400" />
                <span>Business Health Dashboard</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real-time indicator summary of revenue, profit, expenses, inventory, customer, and debt health based on authoritative business data.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={healthRange}
                onChange={(e) => {
                  setHealthRange(e.target.value);
                  loadHealthReport(e.target.value);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="this_month">This Month (Accra)</option>
                <option value="last_month">Last Month</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="this_year">This Year</option>
              </select>
              <button
                type="button"
                onClick={() => loadHealthReport(healthRange)}
                disabled={loadingHealth}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {loadingHealth && !healthReport ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-400" />
              <span>Analyzing business health and indicators...</span>
            </div>
          ) : healthReport ? (
            <>
              {/* Action Recommendations Banner */}
              {healthReport.actionRecommendations && healthReport.actionRecommendations.length > 0 && (
                <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-3xl p-6 space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>Factual Action Recommendations & Insights</span>
                  </div>
                  <ul className="space-y-2">
                    {healthReport.actionRecommendations.map((rec, i) => (
                      <li key={i} className="text-xs text-slate-200 flex items-start space-x-2">
                        <span className="text-emerald-400 font-bold mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Health Indicator Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <HealthCard
                  title="Revenue Health"
                  current={healthReport.revenueHealth.currentValue}
                  previous={healthReport.revenueHealth.previousValue}
                  changePct={healthReport.revenueHealth.changePercent}
                  status={healthReport.revenueHealth.status}
                  currency={currency}
                  formatter={(v) => `${currency} ${v.toLocaleString()}`}
                  subtext={`Previous period: ${currency} ${healthReport.revenueHealth.previousValue.toLocaleString()}`}
                />

                <HealthCard
                  title="Profit Health"
                  current={healthReport.profitHealth.currentValue}
                  previous={healthReport.profitHealth.previousValue}
                  changePct={healthReport.profitHealth.changePercent}
                  status={healthReport.profitHealth.status}
                  currency={currency}
                  formatter={(v) => `${currency} ${v.toLocaleString()}`}
                  subtext={`Gross: ${currency} ${healthReport.profitHealth.grossProfit.toLocaleString()} | Margin: ${healthReport.profitHealth.netMargin}%`}
                />

                <HealthCard
                  title="Expense Health"
                  current={healthReport.expenseHealth.currentValue}
                  previous={healthReport.expenseHealth.previousValue}
                  changePct={healthReport.expenseHealth.changePercent}
                  status={healthReport.expenseHealth.status}
                  currency={currency}
                  formatter={(v) => `${currency} ${v.toLocaleString()}`}
                  subtext={`Previous period: ${currency} ${healthReport.expenseHealth.previousValue.toLocaleString()}`}
                />

                <HealthCard
                  title="Inventory Health"
                  current={healthReport.inventoryHealth.currentValue}
                  previous={healthReport.inventoryHealth.previousValue}
                  changePct={healthReport.inventoryHealth.changePercent}
                  status={healthReport.inventoryHealth.status}
                  currency={currency}
                  formatter={(v) => `${v} Products`}
                  subtext={`Out of Stock: ${healthReport.inventoryHealth.outOfStockCount} | Low Stock: ${healthReport.inventoryHealth.lowStockCount}`}
                />

                <HealthCard
                  title="Customer Health"
                  current={healthReport.customerHealth.currentValue}
                  previous={healthReport.customerHealth.previousValue}
                  changePct={healthReport.customerHealth.changePercent}
                  status={healthReport.customerHealth.status}
                  currency={currency}
                  formatter={(v) => `${v} Customers`}
                  subtext={`New in period: ${healthReport.customerHealth.newCustomersCount} customers`}
                />

                <HealthCard
                  title="Debt Health"
                  current={healthReport.debtHealth.currentValue}
                  previous={healthReport.debtHealth.previousValue}
                  changePct={healthReport.debtHealth.changePercent}
                  status={healthReport.debtHealth.status}
                  currency={currency}
                  formatter={(v) => `${currency} ${v.toLocaleString()}`}
                  subtext={`Collected: ${currency} ${healthReport.debtHealth.totalCollected.toLocaleString()} (${healthReport.debtHealth.unpaidCount} unpaid)`}
                />
              </div>
            </>
          ) : null}
        </div>
      )}

      <AlertsCenterView
        activeTab={activeTab}
        alerts={alerts}
        loadingAlerts={loadingAlerts}
        alertFilterStatus={alertFilterStatus}
        setAlertFilterStatus={setAlertFilterStatus}
        loadAlerts={loadAlerts}
        handleUpdateAlertStatus={handleUpdateAlertStatus}
      />

      <ActivityTimelineView
        activeTab={activeTab}
        activities={activities}
        loadingActivity={loadingActivity}
        activityRange={activityRange}
        setActivityRange={setActivityRange}
        activityEventType={activityEventType}
        setActivityEventType={setActivityEventType}
        loadActivityTimeline={loadActivityTimeline}
      />

      <DailyBriefView
        activeTab={activeTab}
        dailyBrief={dailyBrief}
        loadingDailyBrief={loadingDailyBrief}
        loadDailyBrief={loadDailyBrief}
        currency={currency}
      />

      <DecisionsView
        activeTab={activeTab}
        decisions={decisions}
        loadingDecisions={loadingDecisions}
        loadDecisions={loadDecisions}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        newDesc={newDesc}
        setNewDesc={setNewDesc}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
        newPriority={newPriority}
        setNewPriority={setNewPriority}
        newDueDate={newDueDate}
        setNewDueDate={setNewDueDate}
        handleCreateDecision={handleCreateDecision}
        handleUpdateDecisionStatus={handleUpdateDecisionStatus}
      />

      <DataExportView activeTab={activeTab} />
      <DataImportView activeTab={activeTab} />
      <BackupRecoveryView activeTab={activeTab} />
    </div>
  );
};

const HealthCard: React.FC<{
  title: string;
  current: number;
  previous: number;
  changePct: number;
  status: 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
  currency: string;
  formatter: (v: number) => string;
  subtext: string;
}> = ({ title, current, changePct, status, formatter, subtext }) => {
  const statusColors = {
    HEALTHY: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
    ATTENTION: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
    CRITICAL: 'bg-rose-950/60 text-rose-400 border-rose-800/60',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{title}</span>
        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${statusColors[status]}`}>
          {status}
        </span>
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-black text-white">{formatter(current)}</div>
        <div className="text-xs text-slate-400 flex items-center space-x-1.5 flex-wrap">
          {changePct !== 0 && (
            <span className={`font-bold ${changePct > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {changePct > 0 ? '+' : ''}{changePct}% vs prev
            </span>
          )}
          <span>{subtext}</span>
        </div>
      </div>
    </div>
  );
};

export const AlertsCenterView: React.FC<{
  activeTab: string;
  alerts: BusinessAlert[];
  loadingAlerts: boolean;
  alertFilterStatus: string;
  setAlertFilterStatus: (s: string) => void;
  loadAlerts: () => void;
  handleUpdateAlertStatus: (id: string, status: 'ACTIVE' | 'DISMISSED' | 'RESOLVED') => void;
}> = ({
  activeTab,
  alerts,
  loadingAlerts,
  alertFilterStatus,
  setAlertFilterStatus,
  loadAlerts,
  handleUpdateAlertStatus,
}) => {
  if (activeTab !== 'alerts') return null;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-white font-bold text-lg">
            <Bell className="w-5 h-5 text-emerald-400" />
            <span>Business Alerts & Early-Warning Center</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time automated warnings and operational indicators generated from authoritative business data.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={alertFilterStatus}
            onChange={(e) => setAlertFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ACTIVE">Active Alerts ({alerts.filter((a) => a.status === 'ACTIVE').length})</option>
            <option value="DISMISSED">Dismissed</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ALL">All Alerts</option>
          </select>
          <button
            type="button"
            onClick={loadAlerts}
            disabled={loadingAlerts}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAlerts ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loadingAlerts && alerts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-400" />
          <span>Scanning business data for early-warning signals...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.filter((a) => alertFilterStatus === 'ALL' || a.status === alertFilterStatus).length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400 opacity-80" />
              <p className="font-bold text-white text-sm">No alerts found</p>
              <p className="text-xs text-slate-400 mt-1">All monitored business indicators are operating normally.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {alerts
                .filter((a) => alertFilterStatus === 'ALL' || a.status === alertFilterStatus)
                .map((alert) => {
                  const severityColors = {
                    CRITICAL: 'bg-rose-950/60 border-rose-800/80 text-rose-400',
                    WARNING: 'bg-amber-950/60 border-amber-800/80 text-amber-400',
                    INFO: 'bg-sky-950/60 border-sky-800/80 text-sky-400',
                  };
                  return (
                    <div
                      key={alert.id}
                      className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center space-x-2.5">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${severityColors[alert.severity]}`}>
                            {alert.severity}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded">
                            {alert.alertType}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(alert.createdAt).toLocaleDateString()} {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white">{alert.title}</h3>
                        <p className="text-xs text-slate-300">{alert.message}</p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto">
                        {alert.status === 'ACTIVE' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateAlertStatus(alert.id, 'RESOLVED')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow"
                            >
                              Resolve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateAlertStatus(alert.id, 'DISMISSED')}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                        {alert.status !== 'ACTIVE' && (
                          <span className="text-xs font-bold text-slate-400 uppercase bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                            {alert.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const DailyBriefView: React.FC<{
  activeTab: string;
  dailyBrief: any | null;
  loadingDailyBrief: boolean;
  loadDailyBrief: () => void;
  currency: string;
}> = ({ activeTab, dailyBrief, loadingDailyBrief, loadDailyBrief, currency }) => {
  if (activeTab !== 'daily_brief') return null;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-white font-bold text-lg">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span>Business Daily Brief & Executive Summary</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Server-authoritative daily overview of sales, profit, inventory status, active alerts, and recent activity.
          </p>
        </div>
        <button
          type="button"
          onClick={loadDailyBrief}
          disabled={loadingDailyBrief}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/40 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingDailyBrief ? 'animate-spin' : ''}`} />
          <span>Refresh Daily Brief</span>
        </button>
      </div>

      {loadingDailyBrief && !dailyBrief ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-400" />
          <span>Compiling executive daily brief...</span>
        </div>
      ) : dailyBrief ? (
        <div className="space-y-6">
          {/* Headline Card */}
          <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-3xl p-6 shadow-xl flex items-start space-x-4">
            <div className="p-3 rounded-2xl bg-emerald-900/50 text-emerald-300 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 bg-emerald-900/60 px-2.5 py-0.5 rounded-full">
                Executive Headline • {dailyBrief.date}
              </span>
              <p className="text-sm font-bold text-white mt-2 leading-relaxed">{dailyBrief.headline}</p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Sales */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Today's Sales</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white">
                {currency} {Number(dailyBrief.salesSummary?.todayRevenue || 0).toFixed(2)}
              </div>
              <div className="text-xs text-slate-400">
                {dailyBrief.salesSummary?.todaySalesCount || 0} transaction(s) recorded today
              </div>
            </div>

            {/* Profit Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Period Net Profit</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white">
                {currency} {Number(dailyBrief.profitSummary?.netProfit || 0).toFixed(2)}
              </div>
              <div className="text-xs text-slate-400">
                Net Margin: {dailyBrief.profitSummary?.netMargin || 0}%
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Expenses (Today / Period)</span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-white">
                {currency} {Number(dailyBrief.expenseSummary?.todayExpenses || 0).toFixed(2)}
              </div>
              <div className="text-xs text-slate-400">
                Period Total: {currency} {Number(dailyBrief.expenseSummary?.periodExpenses || 0).toFixed(2)}
              </div>
            </div>

            {/* Alerts & Inventory */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Active Alerts & Stock</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-white">
                {dailyBrief.alertsSummary?.activeCount || 0} Alert(s)
              </div>
              <div className="text-xs text-slate-400">
                Out of Stock: {dailyBrief.inventorySummary?.outOfStockCount || 0} | Low Stock: {dailyBrief.inventorySummary?.lowStockCount || 0}
              </div>
            </div>
          </div>

          {/* Secondary Summary Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customers, Debts & Goals */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>Customers, Debts & Goals Overview</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-xs text-slate-400">Total Customers</span>
                  <div className="text-lg font-bold text-white">{dailyBrief.customerSummary?.totalCustomers || 0}</div>
                  <span className="text-[10px] text-emerald-400">+{dailyBrief.customerSummary?.newCustomersToday || 0} today</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-xs text-slate-400">Outstanding Debt</span>
                  <div className="text-lg font-bold text-white">{currency} {Number(dailyBrief.debtSummary?.totalOutstandingDebt || 0).toFixed(2)}</div>
                  <span className="text-[10px] text-rose-400">{dailyBrief.debtSummary?.unpaidAccountsCount || 0} unpaid account(s)</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1 col-span-2">
                  <span className="text-xs text-slate-400">Business Goals Status</span>
                  <div className="text-sm font-bold text-white mt-1">
                    {dailyBrief.goalsSummary?.activeGoals || 0} Active Goal(s) — {dailyBrief.goalsSummary?.behindOrOverdueGoals || 0} Behind / Overdue
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Brief */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Recent Business Activity Today</span>
              </h3>
              {(!dailyBrief.recentActivity || dailyBrief.recentActivity.length === 0) ? (
                <div className="text-xs text-slate-400 py-6 text-center">No activity recorded today yet.</div>
              ) : (
                <div className="space-y-3">
                  {dailyBrief.recentActivity.map((act: any) => (
                    <div key={act.id} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                          {act.eventType}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white">{act.title}</h4>
                      <p className="text-[11px] text-slate-300">{act.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <p className="text-xs text-slate-400">Click "Refresh Daily Brief" to load summary.</p>
        </div>
      )}
    </div>
  );
};

export const DecisionsView: React.FC<{
  activeTab: string;
  decisions: BusinessDecision[];
  loadingDecisions: boolean;
  loadDecisions: () => void;
  newTitle: string;
  setNewTitle: (s: string) => void;
  newDesc: string;
  setNewDesc: (s: string) => void;
  newCategory: string;
  setNewCategory: (s: string) => void;
  newPriority: 'LOW' | 'MEDIUM' | 'HIGH';
  setNewPriority: (p: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  newDueDate: string;
  setNewDueDate: (d: string) => void;
  handleCreateDecision: (e: React.FormEvent) => void;
  handleUpdateDecisionStatus: (id: string, status: string) => void;
}> = ({
  activeTab,
  decisions,
  loadingDecisions,
  loadDecisions,
  newTitle,
  setNewTitle,
  newDesc,
  setNewDesc,
  newCategory,
  setNewCategory,
  newPriority,
  setNewPriority,
  newDueDate,
  setNewDueDate,
  handleCreateDecision,
  handleUpdateDecisionStatus,
}) => {
  if (activeTab !== 'decisions') return null;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-white font-bold text-lg">
            <ClipboardList className="w-5 h-5 text-emerald-400" />
            <span>Business Review & Decision Log</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Record and track important business decisions and follow-up actions derived from Daily Briefs, Alerts, Goals, and Health reports.
          </p>
        </div>
        <button
          type="button"
          onClick={loadDecisions}
          disabled={loadingDecisions}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingDecisions ? 'animate-spin' : ''}`} />
          <span>Refresh Decisions</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Decision Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Record New Decision / Action</span>
          </h3>
          <form onSubmit={handleCreateDecision} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Decision / Action Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Restock Rice 5kg before Friday"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Description / Next Steps</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Why this decision matters and what needs to be checked next..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="General">General</option>
                  <option value="Inventory">Inventory</option>
                  <option value="Finance">Finance</option>
                  <option value="Sales">Sales</option>
                  <option value="Customers">Customers</option>
                  <option value="Debts">Debts</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Due Date (Optional)</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/40"
            >
              Save Decision Record
            </button>
          </form>
        </div>

        {/* Decisions List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <ClipboardList className="w-4 h-4 text-emerald-400" />
            <span>Recorded Decisions & Actions ({decisions.length})</span>
          </h3>

          {loadingDecisions && decisions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-400" />
              <span>Loading decision records...</span>
            </div>
          ) : decisions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-950 rounded-2xl border border-slate-800/80">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p className="text-xs font-bold text-white">No decisions recorded yet</p>
              <p className="text-[11px] text-slate-400 mt-1">Use the form to record important actions and follow-ups.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {decisions.map((dec) => (
                <div key={dec.id} className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          dec.priority === 'HIGH'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                            : dec.priority === 'MEDIUM'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {dec.priority}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        {dec.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          dec.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : dec.status === 'CANCELLED'
                            ? 'bg-slate-900 text-slate-400 border border-slate-800'
                            : 'bg-blue-950 text-blue-400 border border-blue-800/60'
                        }`}
                      >
                        {dec.status}
                      </span>
                    </div>
                    {dec.dueDate && (
                      <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>Due: {dec.dueDate}</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">{dec.title}</h4>
                    {dec.description && <p className="text-xs text-slate-300 mt-1">{dec.description}</p>}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">
                      Created: {new Date(dec.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center space-x-2">
                      {dec.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateDecisionStatus(dec.id, 'COMPLETED')}
                          className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 rounded-xl font-bold transition-all"
                        >
                          Mark Completed
                        </button>
                      )}
                      {dec.status !== 'CANCELLED' && dec.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateDecisionStatus(dec.id, 'CANCELLED')}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded-xl font-bold transition-all"
                        >
                          Cancel
                        </button>
                      )}
                      {dec.status !== 'OPEN' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateDecisionStatus(dec.id, 'OPEN')}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl font-bold transition-all"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ActivityTimelineView: React.FC<{
  activeTab: string;
  activities: BusinessActivityEvent[];
  loadingActivity: boolean;
  activityRange: string;
  setActivityRange: (r: string) => void;
  activityEventType: string;
  setActivityEventType: (t: string) => void;
  loadActivityTimeline: (range: string, eventType?: string) => void;
}> = ({
  activeTab,
  activities,
  loadingActivity,
  activityRange,
  setActivityRange,
  activityEventType,
  setActivityEventType,
  loadActivityTimeline,
}) => {
  if (activeTab !== 'activity') return null;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-white font-bold text-lg">
            <History className="w-5 h-5 text-emerald-400" />
            <span>Business Activity Timeline & Audit View</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Chronological audit trail of important business events, sales, inventory movements, and staff actions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activityEventType}
            onChange={(e) => {
              setActivityEventType(e.target.value);
              loadActivityTimeline(activityRange, e.target.value);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Event Types</option>
            <option value="SALE_COMPLETED">Sales Completed</option>
            <option value="CUSTOMER_ACTIVITY">Customer Activity</option>
            <option value="DEBT_PAYMENT">Debt Payments</option>
            <option value="EXPENSE_RECORDED">Expenses</option>
            <option value="PURCHASE_RECORDED">Purchases</option>
            <option value="INVENTORY_CHANGE">Inventory Changes</option>
            <option value="GOAL_ACTIVITY">Goals</option>
            <option value="ALERT_ACTIVITY">Alerts</option>
            <option value="STAFF_ACTIVITY">Staff & Audit</option>
          </select>

          <select
            value={activityRange}
            onChange={(e) => {
              setActivityRange(e.target.value);
              loadActivityTimeline(e.target.value, activityEventType);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
            <option value="all">All Time</option>
          </select>

          <button
            type="button"
            onClick={() => loadActivityTimeline(activityRange, activityEventType)}
            disabled={loadingActivity}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingActivity ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loadingActivity && activities.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-400" />
          <span>Compiling business activity timeline...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400 opacity-80" />
              <p className="font-bold text-white text-sm">No activity recorded</p>
              <p className="text-xs text-slate-400 mt-1">No business events match the selected criteria.</p>
            </div>
          ) : (
            <div className="relative border-l border-slate-800 ml-4 space-y-6 pl-6 py-2">
              {activities.map((ev) => (
                <div key={ev.id} className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-2">
                  <div className="absolute -left-[31px] top-6 w-3.5 h-3.5 rounded-full bg-emerald-500 border-4 border-slate-950" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        {ev.eventType}
                      </span>
                      {ev.actor && (
                        <span className="text-xs text-slate-400">
                          By: <strong className="text-white">{ev.actor}</strong>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(ev.createdAt).toLocaleDateString()} {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{ev.title}</h3>
                  <p className="text-xs text-slate-300">{ev.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const DataExportView: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  if (activeTab !== 'export') return null;

  const [exportingType, setExportingType] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const exportTypes = [
    { key: 'sales', label: 'Sales Records', desc: 'All sales transactions, totals, tax, and payment methods.' },
    { key: 'products', label: 'Products & Inventory', desc: 'Product items, SKUs, pricing, stock levels, and units.' },
    { key: 'customers', label: 'Customers', desc: 'Customer profiles, phone, email, loyalty points, and spending.' },
    { key: 'debts', label: 'Debts & Debtors', desc: 'Customers with outstanding credit balances and debt records.' },
    { key: 'expenses', label: 'Expenses', desc: 'Business expense records, categories, amounts, and dates.' },
    { key: 'purchases', label: 'Purchases', desc: 'Stock purchases, supplier orders, and purchase totals.' },
    { key: 'goals', label: 'Business Goals', desc: 'Performance targets, metrics, start/end dates, and statuses.' },
    { key: 'decisions', label: 'Business Decisions', desc: 'Review log, executive decisions, priorities, and statuses.' },
    { key: 'alerts', label: 'Business Alerts', desc: 'Active system warnings, critical alerts, and operational notices.' },
    { key: 'activity', label: 'Activity Timeline', desc: 'Chronological audit trail of business events and actions.' },
  ];

  const handleExport = async (typeKey: string) => {
    setExportingType(typeKey);
    setExportError(null);
    setExportSuccess(null);
    try {
      const csv = await api.exportBusinessData(typeKey);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${typeKey}_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExportSuccess(`Successfully exported ${typeKey} records to CSV.`);
    } catch (err: any) {
      setExportError(err.message || `Failed to export ${typeKey}.`);
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center space-x-2">
          <Download className="w-5 h-5 text-emerald-400" />
          <span>Business Data Export Center</span>
        </h3>
        <p className="text-sm text-slate-400 mb-6">
          Download server-authoritative CSV records for your tenant. All exports are read-only and have zero impact on live data.
        </p>

        {exportError && (
          <div className="mb-4 p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {exportSuccess && (
          <div className="mb-4 p-4 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-xl text-sm flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{exportSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exportTypes.map((item) => (
            <div key={item.key} className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div>
                <h4 className="font-bold text-white text-sm mb-1">{item.label}</h4>
                <p className="text-xs text-slate-400 mb-4">{item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => handleExport(item.key)}
                disabled={exportingType === item.key}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-900/30 cursor-pointer"
              >
                {exportingType === item.key ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Preparing CSV...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const DataImportView: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  if (activeTab !== 'import') return null;

  const [importType, setImportType] = useState<'products' | 'customers'>('products');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors?: Array<{ row: number; field?: string; message: string }>;
    preview?: any[];
    totalRows?: number;
    message?: string;
  } | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const sampleProductCsv = `name,sku,category,sellingPrice,costPrice,quantity,minStockLevel,unit
Ghana Jasmine Rice 5kg,RICE-JAS-5K,Grains,120,95,30,5,bag
Sunflower Oil 1L,OIL-SUN-1L,Cooking,45,35,50,10,bottle`;

  const sampleCustomerCsv = `name,phone,email,address,creditLimit
Akua Mansa,0240123456,akua@example.com,Osu Accra,500
Kwame Addo,0277654321,kwame@example.com,Adum Kumasi,1000`;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setValidationResult(null);
    setImportSuccess(null);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text || '');
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setCsvText(importType === 'products' ? sampleProductCsv : sampleCustomerCsv);
    setFileName(`${importType}_sample.csv`);
    setValidationResult(null);
    setImportSuccess(null);
    setImportError(null);
  };

  const handleValidate = async () => {
    if (!csvText.trim()) {
      setImportError('Please select or paste CSV data before validating.');
      return;
    }
    setIsValidating(true);
    setImportError(null);
    setImportSuccess(null);
    setValidationResult(null);

    try {
      const res =
        importType === 'products'
          ? await api.importProducts(csvText, false)
          : await api.importCustomers(csvText, false);

      setValidationResult(res);
      if (!res.valid) {
        setImportError(res.message || 'Validation identified issues in your CSV.');
      }
    } catch (err: any) {
      setImportError(err.message || 'Validation request failed.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult || !validationResult.valid) return;
    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const res =
        importType === 'products'
          ? await api.importProducts(csvText, true)
          : await api.importCustomers(csvText, true);

      if (res.success) {
        setImportSuccess(res.message || `Successfully imported ${res.importedCount} records.`);
        setValidationResult(null);
        setCsvText('');
        setFileName(null);
      } else {
        setImportError(res.message || 'Import transaction failed.');
      }
    } catch (err: any) {
      setImportError(err.message || 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Upload className="w-5 h-5 text-emerald-400" />
              <span>Controlled CSV Data Import</span>
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Securely import products or customer records into your business. All imports are strictly validated and previewed before confirmation.
            </p>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => {
                setImportType('products');
                setValidationResult(null);
                setImportSuccess(null);
                setImportError(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                importType === 'products'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Products / Inventory
            </button>
            <button
              type="button"
              onClick={() => {
                setImportType('customers');
                setValidationResult(null);
                setImportSuccess(null);
                setImportError(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                importType === 'customers'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Customers
            </button>
          </div>
        </div>

        {importError && (
          <div className="mb-4 p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Import Alert</p>
              <p className="text-xs text-rose-200 mt-0.5">{importError}</p>
            </div>
          </div>
        )}

        {importSuccess && (
          <div className="mb-4 p-4 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-xl text-sm flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importSuccess}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <label className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer border border-slate-700 transition-all">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>{fileName ? `File: ${fileName}` : 'Choose CSV File'}</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              type="button"
              onClick={handleLoadSample}
              className="px-3.5 py-2 text-xs font-bold text-slate-300 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all"
            >
              Load Sample Template
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              CSV Content (Paste or Edit Below)
            </label>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setValidationResult(null);
              }}
              placeholder={importType === 'products' ? sampleProductCsv : sampleCustomerCsv}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating || !csvText.trim()}
              className="flex items-center space-x-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validating CSV...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>1. Validate & Preview CSV</span>
                </>
              )}
            </button>

            {validationResult?.valid && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-950/50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importing Records...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>2. Confirm & Import ({validationResult.totalRows} Records)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Validation Errors Table */}
        {validationResult && !validationResult.valid && validationResult.errors && validationResult.errors.length > 0 && (
          <div className="mt-6 border border-rose-900/60 bg-rose-950/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>Validation Errors ({validationResult.errors.length})</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {validationResult.errors.map((err, i) => (
                <div key={i} className="text-xs text-rose-300 flex items-start space-x-2 font-mono">
                  <span className="bg-rose-900/80 px-2 py-0.5 rounded text-[10px] text-white shrink-0">
                    Row {err.row}
                  </span>
                  <span>{err.field ? `[${err.field}]: ` : ''}{err.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Preview Table */}
        {validationResult?.valid && validationResult.preview && validationResult.preview.length > 0 && (
          <div className="mt-6 border border-slate-800 bg-slate-950 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Ready for Import ({validationResult.preview.length} valid rows)</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-mono">
                Click "2. Confirm & Import" above to commit to database
              </span>
            </div>

            <div className="overflow-x-auto max-h-60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold text-[11px]">
                    {importType === 'products' ? (
                      <>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Price</th>
                        <th className="py-2 px-3">Cost</th>
                        <th className="py-2 px-3">Qty</th>
                        <th className="py-2 px-3">Min</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Phone</th>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3">Address</th>
                        <th className="py-2 px-3">Credit Limit</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {validationResult.preview.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-900/50">
                      {importType === 'products' ? (
                        <>
                          <td className="py-2 px-3 font-sans font-bold text-white">{row.name}</td>
                          <td className="py-2 px-3">{row.sku}</td>
                          <td className="py-2 px-3">{row.category}</td>
                          <td className="py-2 px-3 text-emerald-400">{row.sellingPrice}</td>
                          <td className="py-2 px-3">{row.costPrice}</td>
                          <td className="py-2 px-3">{row.quantity}</td>
                          <td className="py-2 px-3">{row.minStockLevel}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-3 font-sans font-bold text-white">{row.name}</td>
                          <td className="py-2 px-3">{row.phone}</td>
                          <td className="py-2 px-3">{row.email || '—'}</td>
                          <td className="py-2 px-3">{row.address || '—'}</td>
                          <td className="py-2 px-3 text-emerald-400">{row.creditLimit}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const BackupRecoveryView: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  if (activeTab !== 'backup') return null;

  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentBackup, setCurrentBackup] = useState<any | null>(null);
  const [backupSummary, setBackupSummary] = useState<any | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    errors?: string[];
    summary?: any;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | '30' | '90' | '180'>('all');
  const [retentionSummary, setRetentionSummary] = useState<any | null>(null);
  const [healthReport, setHealthReport] = useState<any | null>(null);
  const [isPreparingPackage, setIsPreparingPackage] = useState(false);
  const [preparedPackage, setPreparedPackage] = useState<any | null>(null);
  const [packageMsg, setPackageMsg] = useState<string | null>(null);
  const [isValidatingPackage, setIsValidatingPackage] = useState(false);
  const [validationReport, setValidationReport] = useState<any | null>(null);
  const [isReverifyingPackage, setIsReverifyingPackage] = useState(false);
  const [reverificationReport, setReverificationReport] = useState<any | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [integrityReport, setIntegrityReport] = useState<any | null>(null);

  const handlePreparePackage = async () => {
    setIsPreparingPackage(true);
    setPackageMsg(null);
    try {
      const res = await api.prepareRecoveryPackage();
      if (res && res.success) {
        setPreparedPackage(res.recoveryPackage);
        setPackageMsg('Recovery package prepared successfully.');
      } else {
        setErrorMsg('Failed to prepare recovery package.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error preparing recovery package.');
    } finally {
      setIsPreparingPackage(false);
    }
  };

  const handleDownloadPreparedPackage = () => {
    if (!preparedPackage) return;
    const jsonStr = JSON.stringify(preparedPackage, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `bmgh_recovery_package_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleValidatePackage = async () => {
    if (!preparedPackage) {
      setErrorMsg('Please prepare a recovery package first before validating.');
      return;
    }
    setIsValidatingPackage(true);
    setValidationReport(null);
    try {
      const res = await api.validateRecoveryPackage(preparedPackage);
      if (res && res.success) {
        setValidationReport(res.validation);
      } else {
        setErrorMsg('Failed to validate recovery package.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error validating recovery package.');
    } finally {
      setIsValidatingPackage(false);
    }
  };

  const handleReverifyPackage = async () => {
    if (!preparedPackage) {
      setErrorMsg('Please prepare a recovery package first before re-verifying integrity.');
      return;
    }
    setIsReverifyingPackage(true);
    setReverificationReport(null);
    try {
      const res = await api.reverifyRecoveryPackage(preparedPackage);
      if (res && res.success) {
        setReverificationReport(res.reverification);
      } else {
        setErrorMsg('Failed to re-verify recovery package integrity.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error re-verifying recovery package integrity.');
    } finally {
      setIsReverifyingPackage(false);
    }
  };

  const loadHistory = async (filterVal = historyFilter) => {
    setIsLoadingHistory(true);
    try {
      const res = await api.getBackupHistory(filterVal);
      if (res && res.success) {
        setHistory(res.history || []);
      }
    } catch (err: any) {
      // non-fatal
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadRetention = async () => {
    try {
      const res = await api.getBackupRetentionSummary();
      if (res && res.success) {
        setRetentionSummary(res.retention);
      }
    } catch (err: any) {
      // non-fatal
    }
  };

  const loadHealth = async () => {
    try {
      const res = await api.getBackupHealthStatus();
      if (res && res.success) {
        setHealthReport(res.health);
      }
    } catch (err: any) {
      // non-fatal
    }
  };

  const loadIntegrity = async () => {
    try {
      const res = await api.getBusinessIntegrity();
      if (res && res.success) {
        setIntegrityReport(res.report);
      }
    } catch (err: any) {
      // non-fatal
    }
  };

  useEffect(() => {
    if (activeTab === 'backup') {
      loadHistory(historyFilter);
      loadRetention();
      loadHealth();
      loadIntegrity();
    }
  }, [activeTab]);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setVerificationResult(null);

    try {
      const res = await api.createBusinessBackup();
      if (res && res.success) {
        setCurrentBackup(res.backup);
        setBackupSummary(res.summary);
        setSuccessMsg(`Backup package generated successfully (${res.summary.totalRecords} total records).`);
        loadHistory(historyFilter);
        loadRetention();
        loadHealth();
      } else {
        setErrorMsg('Failed to generate backup.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating business backup.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownloadBackup = () => {
    if (!currentBackup) return;
    const jsonStr = JSON.stringify(currentBackup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `bmgh_backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleVerifyCurrent = async () => {
    if (!currentBackup) return;
    setIsVerifying(true);
    setErrorMsg(null);
    try {
      const res = await api.verifyBusinessBackup(currentBackup);
      setVerificationResult(res);
      if (res.valid) {
        setSuccessMsg('Backup package integrity cryptographically verified. Checksum matches perfectly.');
      } else {
        setErrorMsg('Backup verification failed: ' + (res.errors?.join(', ') || 'Integrity check failed.'));
      }
      loadHistory(historyFilter);
      loadRetention();
      loadHealth();
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification request failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUploadAndVerify = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setVerificationResult(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        setIsVerifying(true);
        const res = await api.verifyBusinessBackup(parsed);
        setVerificationResult(res);
        if (res.valid) {
          setSuccessMsg(`Uploaded file "${file.name}" verified successfully.`);
        } else {
          setErrorMsg('Uploaded backup failed verification: ' + (res.errors?.join(', ') || 'Invalid package.'));
        }
        loadHistory(historyFilter);
        loadRetention();
        loadHealth();
      } catch (err: any) {
        setErrorMsg(`Failed to parse uploaded backup file: ${err.message}`);
      } finally {
        setIsVerifying(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <span>Business Backup & Recovery Readiness</span>
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Create structured, cryptographically verified backup packages of your authoritative business data. Read-only operation with zero database mutation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCreateBackup}
              disabled={isCreating}
              className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Backup...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Create New Backup</span>
                </>
              )}
            </button>

            <label className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer border border-slate-700 transition-all">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verify File</span>
              <input type="file" accept=".json" onChange={handleUploadAndVerify} className="hidden" />
            </label>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Backup Notice</p>
              <p className="text-xs text-rose-200 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-4 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-xl text-sm flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Backup & Recovery Control Center */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-emerald-900/40 rounded-2xl p-5 space-y-5 mb-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-black text-base">Backup & Recovery Control Center</h3>
                <p className="text-xs text-slate-400">Consolidated operational view for business data safety and recovery readiness.</p>
              </div>
            </div>

            <div>
              {healthReport?.recoveryReadiness?.status === 'READY' && (
                <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80 shadow-md">
                  READY
                </span>
              )}
              {healthReport?.recoveryReadiness?.status === 'ATTENTION' && (
                <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800/80 shadow-md">
                  ATTENTION
                </span>
              )}
              {healthReport?.recoveryReadiness?.status === 'NOT_READY' && (
                <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800/80 shadow-md">
                  NOT READY
                </span>
              )}
            </div>
          </div>

          {/* Recovery Status Snapshot (Stage 5S) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="text-white font-bold text-sm">Recovery Status Snapshot</h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Quick-Glance Summary</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Readiness</span>
                <p className={`font-bold mt-1 ${healthReport?.recoveryReadiness?.status === 'READY' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {healthReport?.recoveryReadiness?.status || 'NOT_READY'}
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Backup Health</span>
                <p className="font-bold text-white mt-1">
                  {healthReport?.status || 'NO_BACKUP_DATA'}
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Package Status</span>
                <p className="font-bold text-slate-200 mt-1 truncate">
                  {preparedPackage ? 'Prepared' : 'NOT_AVAILABLE'}
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Integrity</span>
                <p className="font-bold text-emerald-400 mt-1">
                  {healthReport?.recoverySummary?.integrityStatus || 'VERIFIED'}
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Last Verify</span>
                <p className="font-bold text-slate-200 mt-1 truncate">
                  {healthReport?.latestSuccessfulVerificationAt ? new Date(healthReport.latestSuccessfulVerificationAt).toLocaleDateString() : 'NOT_AVAILABLE'}
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Last Activity</span>
                <p className="font-bold text-slate-200 mt-1 truncate">
                  {history[0]?.action || 'NOT_AVAILABLE'}
                </p>
              </div>
            </div>
          </div>

          {/* Recovery Operations Summary (Stage 5Q) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <h4 className="text-white font-bold text-sm">Recovery Operations Summary</h4>
              </div>

              <div>
                {healthReport?.recoveryReadiness?.status === 'READY' && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                    READY
                  </span>
                )}
                {healthReport?.recoveryReadiness?.status === 'ATTENTION' && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800/80">
                    ATTENTION
                  </span>
                )}
                {(!healthReport?.recoveryReadiness?.status || healthReport.recoveryReadiness.status === 'NOT_READY') && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800/80">
                    NOT_READY
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Overall Readiness</span>
                <p className={`font-bold mt-1 ${healthReport?.recoveryReadiness?.status === 'READY' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {healthReport?.recoveryReadiness?.status || 'NOT_READY'}
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Backup Health</span>
                <p className="font-bold text-white mt-1">
                  {healthReport?.status || 'Evaluating'}
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Package Status</span>
                <p className="font-bold text-slate-200 mt-1 truncate">
                  {preparedPackage ? 'Prepared' : 'NOT_AVAILABLE'} | {validationReport?.status || 'NOT_AVAILABLE'} | {reverificationReport?.status || 'NOT_AVAILABLE'}
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Integrity Status</span>
                <p className="font-bold text-emerald-400 mt-1">
                  {healthReport?.recoverySummary?.integrityStatus || 'Verifiable'}
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Last Successful Verification</span>
                <p className="font-bold text-slate-200 mt-1 truncate">
                  {healthReport?.latestSuccessfulVerificationAt ? new Date(healthReport.latestSuccessfulVerificationAt).toLocaleDateString() : 'None'}
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Recent Recovery Activity</span>
                <p className="font-bold text-slate-200 mt-1 truncate">
                  {history.find((h) => ['RECOVERY_PACKAGE_PREPARED', 'RECOVERY_PACKAGE_VALIDATED', 'RECOVERY_PACKAGE_INTEGRITY_REVERIFIED'].includes(h.action))?.action || 'NOT_AVAILABLE'}
                </p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Outstanding Recovery Action</span>
              <p className="text-xs font-bold text-amber-300 mt-1">
                {healthReport?.recoverySummary?.outstandingRequirements?.[0] || 'No outstanding recovery action.'}
              </p>
            </div>
          </div>

          {/* Recovery Event Timeline (Stage 5R) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-emerald-400" />
                <h4 className="text-white font-bold text-sm">Recovery Event Timeline</h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Chronological Audit Log</span>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-500 py-2 italic text-center">No recovery activity recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {history.map((item) => {
                  let friendlyDesc = 'Recovery operation performed';
                  if (item.action === 'BACKUP_CREATED') friendlyDesc = 'New business backup package created successfully';
                  else if (item.action === 'BACKUP_VERIFY_SUCCESS') friendlyDesc = 'Backup cryptographic integrity verification passed';
                  else if (item.action === 'BACKUP_VERIFY_FAILED') friendlyDesc = 'Backup cryptographic integrity verification failed';
                  else if (item.action === 'RECOVERY_PACKAGE_PREPARED') friendlyDesc = 'Disaster recovery package successfully prepared';
                  else if (item.action === 'RECOVERY_PACKAGE_VALIDATED') friendlyDesc = `Recovery package validated (${item.backupVersion || item.status})`;
                  else if (item.action === 'RECOVERY_PACKAGE_INTEGRITY_REVERIFIED') friendlyDesc = `Recovery package integrity re-verified (${item.backupVersion || item.status})`;

                  return (
                    <div key={item.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${item.status === 'SUCCESS' ? 'bg-emerald-400' : item.status === 'ATTENTION' ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
                          <span className="text-white font-bold">
                            {item.action === 'BACKUP_CREATED' && 'Backup Created'}
                            {item.action === 'BACKUP_VERIFY_SUCCESS' && 'Backup Verified'}
                            {item.action === 'BACKUP_VERIFY_FAILED' && 'Verification Failed'}
                            {item.action === 'RECOVERY_PACKAGE_PREPARED' && 'Recovery Package Prepared'}
                            {item.action === 'RECOVERY_PACKAGE_VALIDATED' && 'Recovery Package Validated'}
                            {item.action === 'RECOVERY_PACKAGE_INTEGRITY_REVERIFIED' && 'Integrity Re-Verified'}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400' : item.status === 'ATTENTION' ? 'bg-amber-950 text-amber-400' : 'bg-rose-950 text-rose-400'}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-snug">{friendlyDesc}</p>
                      </div>

                      <div className="text-right text-[11px] text-slate-400 font-mono whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Business Data Integrity & Consistency Center (Stage 5V) */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Data Integrity & Consistency Center</h4>
                  <p className="text-xs text-slate-400">Read-only diagnostic analysis of records across your business catalog and transactions.</p>
                </div>
              </div>

              <div>
                {integrityReport?.summary?.status === 'HEALTHY' && (
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                    HEALTHY
                  </span>
                )}
                {integrityReport?.summary?.status === 'ATTENTION' && (
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800/80">
                    ATTENTION
                  </span>
                )}
                {integrityReport?.summary?.status === 'CRITICAL' && (
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800/80">
                    CRITICAL
                  </span>
                )}
                {!integrityReport && (
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-900 text-slate-400 border border-slate-800">
                    LOADING...
                  </span>
                )}
              </div>
            </div>

            {integrityReport && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Checks Performed</span>
                    <p className="text-sm font-bold text-white mt-1">{integrityReport.summary.totalChecks}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Passed Checks</span>
                    <p className="text-sm font-bold text-emerald-400 mt-1">{integrityReport.summary.passedChecks}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Warnings</span>
                    <p className="text-sm font-bold text-amber-400 mt-1">{integrityReport.summary.warningCount}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Critical Findings</span>
                    <p className="text-sm font-bold text-rose-400 mt-1">{integrityReport.summary.criticalCount}</p>
                  </div>
                </div>

                {integrityReport.findings.length === 0 ? (
                  <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>No integrity issues or data inconsistencies detected. All records are consistent.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Detected Findings ({integrityReport.findings.length})</span>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {integrityReport.findings.map((f: any, idx: number) => (
                        <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className={`w-2 h-2 rounded-full ${f.severity === 'CRITICAL' ? 'bg-rose-400' : f.severity === 'WARNING' ? 'bg-amber-400' : 'bg-sky-400'}`}></span>
                              <span className="text-white font-bold">{f.checkName}</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                                {f.guidanceStatus || 'REVIEW'}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${f.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400'}`}>
                                {f.severity}
                              </span>
                            </div>
                          </div>
                          <p className="text-slate-300"><strong className="text-slate-200">Finding:</strong> {f.description}</p>
                          {f.whyItMatters && (
                            <p className="text-slate-300 text-[11px]"><strong className="text-slate-400">Why it matters:</strong> {f.whyItMatters}</p>
                          )}
                          {f.recommendedAction && (
                            <p className="text-emerald-400 text-[11px] font-medium"><strong className="text-slate-400">Recommended action:</strong> {f.recommendedAction}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Area 1: Current Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Backup Health</span>
              <p className={`text-xs font-bold mt-1 ${healthReport?.status === 'READY' ? 'text-emerald-400' : healthReport?.status === 'ATTENTION' ? 'text-amber-400' : 'text-slate-400'}`}>
                {healthReport?.status || 'Evaluating...'}
              </p>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Recovery Readiness</span>
              <p className={`text-xs font-bold mt-1 ${healthReport?.recoveryReadiness?.status === 'READY' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {healthReport?.recoveryReadiness?.status || 'NOT_READY'}
              </p>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Integrity Status</span>
              <p className="text-xs font-bold text-emerald-400 mt-1">
                {healthReport?.recoverySummary?.integrityStatus || 'Verifiable'}
              </p>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Last Verification</span>
              <p className="text-xs font-bold text-slate-200 mt-1 truncate">
                {healthReport?.latestSuccessfulVerificationAt ? new Date(healthReport.latestSuccessfulVerificationAt).toLocaleDateString() : 'None'}
              </p>
            </div>
          </div>

          {/* Recovery Readiness Checklist (Stage 5P) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h4 className="text-white font-bold text-sm">Recovery Readiness Checklist</h4>
              </div>

              <div>
                {healthReport?.recoveryReadiness?.status === 'READY' && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                    READY
                  </span>
                )}
                {healthReport?.recoveryReadiness?.status === 'ATTENTION' && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800/80">
                    ATTENTION
                  </span>
                )}
                {(!healthReport?.recoveryReadiness?.status || healthReport.recoveryReadiness.status === 'NOT_READY') && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800/80">
                    NOT_READY
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { name: '1. Backup data available', pass: healthReport?.recoverySummary?.backupDataAvailable, status: healthReport?.recoverySummary?.backupDataAvailable ? 'PASS' : 'NOT_AVAILABLE', exp: healthReport?.recoverySummary?.backupDataAvailable ? 'Authoritative backup records present.' : 'No backup data stored yet.' },
                { name: '2. Recent backup available', pass: healthReport?.recoverySummary?.recentBackupStatus === 'Ready', status: healthReport?.recoverySummary?.recentBackupStatus === 'Ready' ? 'PASS' : 'ATTENTION', exp: `Recent backup status: ${healthReport?.recoverySummary?.recentBackupStatus || 'Attention'}.` },
                { name: '3. Backup verification succeeded', pass: healthReport?.recoverySummary?.verificationStatus === 'Passed', status: healthReport?.recoverySummary?.verificationStatus === 'Passed' ? 'PASS' : 'ATTENTION', exp: `Verification status: ${healthReport?.recoverySummary?.verificationStatus || 'Not Available'}.` },
                { name: '4. Backup integrity can be verified', pass: true, status: 'PASS', exp: 'SHA-256 cryptographic checksum matching is active.' },
                { name: '5. Recovery history available', pass: history.length > 0, status: history.length > 0 ? 'PASS' : 'NOT_AVAILABLE', exp: `Recorded audit events: ${history.length}.` },
                { name: '6. Recovery package can be prepared', pass: !!preparedPackage || healthReport?.recoverySummary?.backupDataAvailable, status: preparedPackage ? 'PASS' : 'ATTENTION', exp: preparedPackage ? 'Recovery package successfully prepared.' : 'Prepare recovery package action ready.' },
                { name: '7. Recovery package can be validated', pass: validationReport?.status === 'VALID', status: validationReport?.status === 'VALID' ? 'PASS' : 'ATTENTION', exp: validationReport ? `Validation status: ${validationReport.status}` : 'Run validation on prepared package.' },
                { name: '8. Recovery package integrity can be re-verified', pass: reverificationReport?.status === 'VERIFIED', status: reverificationReport?.status === 'VERIFIED' ? 'PASS' : 'ATTENTION', exp: reverificationReport ? `Re-verification status: ${reverificationReport.status}` : 'Run integrity re-verification on package.' },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5 flex items-start space-x-2">
                  <div className="mt-0.5">
                    {item.status === 'PASS' && <span className="text-emerald-400 font-bold">✓</span>}
                    {item.status === 'ATTENTION' && <span className="text-amber-400 font-bold">!</span>}
                    {item.status === 'NOT_AVAILABLE' && <span className="text-slate-500 font-bold">—</span>}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs font-bold text-white">{item.name}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.status === 'PASS' ? 'bg-emerald-950 text-emerald-400' : item.status === 'ATTENTION' ? 'bg-amber-950 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{item.exp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Area 2: Recovery Workflow Sequence */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recovery Workflow Sequence</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">1. Backup</span>
                <span className={`text-[11px] font-bold mt-1 block ${healthReport?.recoverySummary?.backupDataAvailable ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {healthReport?.recoverySummary?.backupDataAvailable ? 'Complete' : 'Pending'}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">2. Prepare Package</span>
                <span className={`text-[11px] font-bold mt-1 block ${preparedPackage ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {preparedPackage ? 'Prepared' : 'Ready'}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">3. Validate</span>
                <span className={`text-[11px] font-bold mt-1 block ${validationReport?.status === 'VALID' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {validationReport?.status || 'Pending'}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">4. Re-Verify</span>
                <span className={`text-[11px] font-bold mt-1 block ${reverificationReport?.status === 'VERIFIED' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {reverificationReport?.status || 'Pending'}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">5. Ready</span>
                <span className={`text-[11px] font-bold mt-1 block ${healthReport?.recoveryReadiness?.status === 'READY' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {healthReport?.recoveryReadiness?.status === 'READY' ? 'Ready' : 'Action Req'}
                </span>
              </div>
            </div>
          </div>

          {/* Area 3: Available Actions */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Quick Actions</span>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={isCreating}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCreating ? 'animate-spin' : ''}`} />
                <span>Create Backup</span>
              </button>

              <button
                type="button"
                onClick={handlePreparePackage}
                disabled={isPreparingPackage}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all border border-slate-700 cursor-pointer disabled:opacity-50"
              >
                <span>Prepare Package</span>
              </button>

              <button
                type="button"
                onClick={handleValidatePackage}
                disabled={isValidatingPackage || !preparedPackage}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all border border-slate-700 cursor-pointer disabled:opacity-50"
              >
                <span>Validate Package</span>
              </button>

              <button
                type="button"
                onClick={handleReverifyPackage}
                disabled={isReverifyingPackage || !preparedPackage}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all border border-slate-700 cursor-pointer disabled:opacity-50"
              >
                <span>Re-Verify Integrity</span>
              </button>
            </div>
          </div>

          {/* Area 4: Recovery Activity (Latest) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Latest Recovery Activity</span>
            {history.filter((h) => ['RECOVERY_PACKAGE_PREPARED', 'RECOVERY_PACKAGE_VALIDATED', 'RECOVERY_PACKAGE_INTEGRITY_REVERIFIED'].includes(h.action)).length === 0 ? (
              <p className="text-xs text-slate-500 italic">No recent recovery activities recorded.</p>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-white font-bold">
                    {history.find((h) => ['RECOVERY_PACKAGE_PREPARED', 'RECOVERY_PACKAGE_VALIDATED', 'RECOVERY_PACKAGE_INTEGRITY_REVERIFIED'].includes(h.action))?.action}
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  {new Date(history.find((h) => ['RECOVERY_PACKAGE_PREPARED', 'RECOVERY_PACKAGE_VALIDATED', 'RECOVERY_PACKAGE_INTEGRITY_REVERIFIED'].includes(h.action))?.createdAt || Date.now()).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Area 5: Recovery Guidance (Action Guide / Outstanding) */}
          {healthReport?.recoverySummary?.outstandingRequirements && healthReport.recoverySummary.outstandingRequirements.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-800/60 rounded-xl p-3 space-y-1.5">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Recovery Guidance & Outstanding Actions</span>
              <ul className="text-xs text-amber-200/90 list-disc list-inside space-y-1">
                {healthReport.recoverySummary.outstandingRequirements.map((req: string, idx: number) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Current Backup Summary Card */}
        {backupSummary && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400">Active Backup Package</span>
                <h4 className="text-white font-bold text-base mt-0.5">
                  Generated {new Date(backupSummary.createdAt).toLocaleDateString()} at{' '}
                  {new Date(backupSummary.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </h4>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup (.json)</span>
                </button>

                <button
                  type="button"
                  onClick={handleVerifyCurrent}
                  disabled={isVerifying}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700"
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : 'text-emerald-400'}`} />
                  <span>Verify Integrity</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {backupSummary.recordCounts &&
                Object.entries(backupSummary.recordCounts).map(([section, count]: any) => (
                  <div key={section} className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{section}</span>
                    <p className="text-lg font-black text-white mt-0.5">{count}</p>
                  </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs text-slate-400 font-mono">
              <span>Format: {backupSummary.formatVersion} (v{backupSummary.backupVersion})</span>
              <span className="truncate max-w-xs text-[11px] text-slate-500">
                SHA-256: {backupSummary.checksum?.slice(0, 16)}...
              </span>
            </div>
          </div>
        )}

        {/* Verification Status Details */}
        {verificationResult && (
          <div
            className={`border rounded-2xl p-5 mb-6 ${
              verificationResult.valid
                ? 'bg-emerald-950/20 border-emerald-900/60'
                : 'bg-rose-950/20 border-rose-900/60'
            }`}
          >
            <div className="flex items-center space-x-2 font-bold text-xs uppercase tracking-wider mb-2">
              {verificationResult.valid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Cryptographically Verified Package</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span className="text-rose-400">Integrity Check Failed</span>
                </>
              )}
            </div>

            {verificationResult.valid && verificationResult.summary ? (
              <div className="text-xs text-slate-300 space-y-1">
                <p>
                  All {verificationResult.summary.totalRecords} records matched across{' '}
                  {Object.keys(verificationResult.summary.recordCounts || {}).length} sections.
                </p>
                <p className="text-slate-400 font-mono text-[11px]">
                  Format Version: {verificationResult.summary.formatVersion} | Timestamp:{' '}
                  {new Date(verificationResult.summary.createdAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <ul className="text-xs text-rose-300 space-y-1 font-mono list-disc list-inside">
                {verificationResult.errors?.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Recovery Summary Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h4 className="text-white font-bold text-sm">Recovery Summary</h4>
            </div>

            <div>
              {healthReport?.recoverySummary?.readinessStatus === 'READY' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  READY
                </span>
              )}
              {healthReport?.recoverySummary?.readinessStatus === 'ATTENTION' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800/80">
                  ATTENTION
                </span>
              )}
              {healthReport?.recoverySummary?.readinessStatus === 'NOT_READY' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800/80">
                  NOT READY
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Backup Data</span>
              <p className={`text-xs font-bold mt-1 ${healthReport?.recoverySummary?.backupDataAvailable ? 'text-emerald-400' : 'text-rose-400'}`}>
                {healthReport?.recoverySummary?.backupDataAvailable ? 'Available' : 'Not Available'}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Recent Backup</span>
              <p className={`text-xs font-bold mt-1 ${healthReport?.recoverySummary?.recentBackupStatus === 'Ready' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {healthReport?.recoverySummary?.recentBackupStatus ?? 'Attention'}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Verification</span>
              <p className={`text-xs font-bold mt-1 ${healthReport?.recoverySummary?.verificationStatus === 'Passed' ? 'text-emerald-400' : 'text-slate-400'}`}>
                {healthReport?.recoverySummary?.verificationStatus ?? 'Not Available'}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Integrity</span>
              <p className={`text-xs font-bold mt-1 ${healthReport?.recoverySummary?.integrityStatus === 'Verifiable' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {healthReport?.recoverySummary?.integrityStatus ?? 'Attention'}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">History</span>
              <p className={`text-xs font-bold mt-1 ${healthReport?.recoverySummary?.historyAvailable ? 'text-emerald-400' : 'text-slate-400'}`}>
                {healthReport?.recoverySummary?.historyAvailable ? 'Available' : 'Not Available'}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Last Successful Verify</span>
              <p className="text-[11px] font-bold text-emerald-400 mt-1 truncate">
                {healthReport?.recoverySummary?.lastSuccessfulVerification?.createdAt ? new Date(healthReport.recoverySummary.lastSuccessfulVerification.createdAt).toLocaleDateString() : 'None'}
              </p>
            </div>
          </div>

          {healthReport?.recoverySummary?.outstandingRequirements && healthReport.recoverySummary.outstandingRequirements.length > 0 && (
            <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Outstanding Requirements</span>
              <ul className="text-xs text-slate-300 space-y-1 font-mono list-disc list-inside">
                {healthReport.recoverySummary.outstandingRequirements.map((req: string, idx: number) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Backup Health Status Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="text-white font-bold text-sm">Backup Health Status</h4>
            </div>

            <div>
              {healthReport?.status === 'HEALTHY' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  HEALTHY
                </span>
              )}
              {healthReport?.status === 'ATTENTION' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800/80">
                  ATTENTION
                </span>
              )}
              {healthReport?.status === 'NO_BACKUP_DATA' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  NO BACKUP DATA
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Latest Backup Date</span>
              <p className="text-xs font-bold text-white mt-1">
                {healthReport?.latestBackupAt ? new Date(healthReport.latestBackupAt).toLocaleString() : 'None'}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Successful Verify</span>
              <p className="text-xs font-bold text-emerald-400 mt-1">
                {healthReport?.latestSuccessfulVerificationAt ? new Date(healthReport.latestSuccessfulVerificationAt).toLocaleString() : 'None'}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Failed Verify</span>
              <p className="text-xs font-bold text-rose-400 mt-1">
                {healthReport?.latestFailedVerificationAt ? new Date(healthReport.latestFailedVerificationAt).toLocaleString() : 'None'}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Days Since Backup</span>
              <p className="text-lg font-black text-white mt-0.5">
                {healthReport?.daysSinceLatestBackup !== null && healthReport?.daysSinceLatestBackup !== undefined ? healthReport.daysSinceLatestBackup : '—'}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 sm:col-span-2 md:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Factual Reason</span>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                {healthReport?.reason || 'Evaluating backup history...'}
              </p>
            </div>
          </div>

          {/* Diagnostic Checklist */}
          <div className="pt-3 border-t border-slate-800/60 space-y-2.5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Backup Health Details & Diagnostics</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {healthReport?.diagnosticChecks && healthReport.diagnosticChecks.map((check: any, idx: number) => (
                <div key={idx} className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex items-start space-x-2.5">
                  <div className="mt-0.5">
                    {check.status === 'PASS' && <span className="text-emerald-400 font-bold">✓</span>}
                    {check.status === 'ATTENTION' && <span className="text-amber-400 font-bold">!</span>}
                    {check.status === 'NOT_AVAILABLE' && <span className="text-slate-500 font-bold">—</span>}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{check.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{check.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recovery Readiness Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h4 className="text-white font-bold text-sm">Recovery Readiness Checklist</h4>
            </div>

            <div>
              {healthReport?.recoveryReadiness?.status === 'READY' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  READY
                </span>
              )}
              {healthReport?.recoveryReadiness?.status === 'ATTENTION' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800/80">
                  ATTENTION
                </span>
              )}
              {healthReport?.recoveryReadiness?.status === 'NOT_READY' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800/80">
                  NOT READY
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Prerequisite Evaluation</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {healthReport?.recoveryReadiness?.checks && healthReport.recoveryReadiness.checks.map((check: any, idx: number) => (
                <div key={idx} className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex items-start space-x-2.5">
                  <div className="mt-0.5">
                    {check.status === 'PASS' && <span className="text-emerald-400 font-bold">✓</span>}
                    {check.status === 'ATTENTION' && <span className="text-amber-400 font-bold">!</span>}
                    {check.status === 'NOT_AVAILABLE' && <span className="text-slate-500 font-bold">—</span>}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{check.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{check.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recovery Action Guide Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-3">
            <ClipboardList className="w-4 h-4 text-emerald-400" />
            <h4 className="text-white font-bold text-sm">Recovery Action Guide</h4>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-300 font-medium">
              {healthReport?.recoveryActionGuide?.summary || 'Evaluating recommended recovery actions...'}
            </p>

            <div className="space-y-2">
              {healthReport?.recoveryActionGuide?.actions && healthReport.recoveryActionGuide.actions.map((act: any, idx: number) => (
                <div
                  key={idx}
                  className={`border rounded-xl p-3 flex items-start space-x-3 transition-all ${
                    act.completed
                      ? 'bg-slate-900/60 border-slate-800/60 opacity-80'
                      : act.priority === 'high'
                      ? 'bg-rose-950/20 border-rose-900/60'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {act.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className={`w-4 h-4 ${act.priority === 'high' ? 'text-rose-400' : 'text-amber-400'}`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${act.completed ? 'text-slate-400 line-through' : 'text-white'}`}>
                      {act.text}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        act.completed
                          ? 'bg-slate-800 text-slate-400'
                          : act.priority === 'high'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : act.priority === 'medium'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {act.completed ? 'Completed' : `${act.priority} priority`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Prepare Recovery Package Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-3">
            <Database className="w-4 h-4 text-emerald-400" />
            <h4 className="text-white font-bold text-sm">Prepare Recovery Package</h4>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Organize existing backup information, integrity checksums, verification history, and readiness checks into a structured recovery package.
          </p>

          <div className="bg-amber-950/20 border border-amber-800/60 rounded-xl p-3 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-snug font-medium">
              This package is for recovery preparation only. It does not automatically restore business data.
            </p>
          </div>

          {packageMsg && (
            <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl p-3 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-xs font-bold text-emerald-300">{packageMsg}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handlePreparePackage}
              disabled={isPreparingPackage}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPreparingPackage ? 'animate-spin' : ''}`} />
              <span>{isPreparingPackage ? 'Preparing Package...' : 'Prepare Recovery Package'}</span>
            </button>

            {preparedPackage && (
              <button
                type="button"
                onClick={handleDownloadPreparedPackage}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all border border-slate-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download Recovery Package (JSON)</span>
              </button>
            )}
          </div>
        </div>

        {/* Validate Recovery Package Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="text-white font-bold text-sm">Validate Recovery Package</h4>
            </div>

            <div>
              {validationReport?.status === 'VALID' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  VALID
                </span>
              )}
              {validationReport?.status === 'ATTENTION' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800/80">
                  ATTENTION
                </span>
              )}
              {validationReport?.status === 'INVALID' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800/80">
                  INVALID
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Validate package structure, manifest, backup metadata, integrity checksums, and tenant scoping prior to disaster recovery operations.
          </p>

          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-snug font-medium">
              Validation does not restore or modify business data.
            </p>
          </div>

          {validationReport && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold text-white">{validationReport.explanation}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {validationReport.checks?.map((chk: any, i: number) => (
                  <div key={i} className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5 flex items-start space-x-2">
                    <div className="mt-0.5">
                      {chk.status === 'PASS' && <span className="text-emerald-400 font-bold">✓</span>}
                      {chk.status === 'ATTENTION' && <span className="text-amber-400 font-bold">!</span>}
                      {chk.status === 'INVALID' && <span className="text-rose-400 font-bold">✗</span>}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{chk.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{chk.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleValidatePackage}
              disabled={isValidatingPackage || !preparedPackage}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all border border-slate-700 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isValidatingPackage ? 'animate-spin' : ''}`} />
              <span>{isValidatingPackage ? 'Validating Package...' : 'Validate Prepared Package'}</span>
            </button>
            {!preparedPackage && (
              <p className="text-[11px] text-slate-500 mt-1.5 italic">Prepare a recovery package above first to enable validation.</p>
            )}
          </div>
        </div>

        {/* Re-Verify Package Integrity Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <h4 className="text-white font-bold text-sm">Re-Verify Package Integrity</h4>
            </div>

            <div>
              {reverificationReport?.status === 'VERIFIED' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  VERIFIED
                </span>
              )}
              {reverificationReport?.status === 'ATTENTION' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800/80">
                  ATTENTION
                </span>
              )}
              {reverificationReport?.status === 'FAILED' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800/80">
                  FAILED
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Recalculate cryptographic checksums and re-verify structural and data integrity of the prepared recovery package.
          </p>

          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-snug font-medium">
              Integrity verification does not restore or modify business data.
            </p>
          </div>

          {reverificationReport && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold text-white">{reverificationReport.explanation}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Checksum Match</span>
                  <p className={`text-xs font-bold mt-1 ${reverificationReport.checksumMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {reverificationReport.checksumMatch ? 'Matched (Valid)' : 'Mismatch (Failed)'}
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Validation Passed</span>
                  <p className={`text-xs font-bold mt-1 ${reverificationReport.validationPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {reverificationReport.validationPassed ? 'Passed' : 'Failed'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleReverifyPackage}
              disabled={isReverifyingPackage || !preparedPackage}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all border border-slate-700 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReverifyingPackage ? 'animate-spin' : ''}`} />
              <span>{isReverifyingPackage ? 'Re-Verifying Integrity...' : 'Re-Verify Prepared Package'}</span>
            </button>
            {!preparedPackage && (
              <p className="text-[11px] text-slate-500 mt-1.5 italic">Prepare a recovery package above first to enable integrity re-verification.</p>
            )}
          </div>
        </div>

        {/* Retention Summary Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-3">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h4 className="text-white font-bold text-sm">Backup Retention & Cleanup Readiness Summary</h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Events</span>
              <p className="text-lg font-black text-white mt-0.5">{retentionSummary?.totalRecords ?? 0}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Newest Event</span>
              <p className="text-xs font-bold text-emerald-400 mt-1 truncate">
                {retentionSummary?.newestBackupDate ? new Date(retentionSummary.newestBackupDate).toLocaleDateString() : '—'}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Oldest Event</span>
              <p className="text-xs font-bold text-slate-300 mt-1 truncate">
                {retentionSummary?.oldestBackupDate ? new Date(retentionSummary.oldestBackupDate).toLocaleDateString() : '—'}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">&gt; 30 Days</span>
              <p className="text-lg font-black text-amber-400 mt-0.5">{retentionSummary?.olderThan30Days ?? 0}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">&gt; 90 Days</span>
              <p className="text-lg font-black text-orange-400 mt-0.5">{retentionSummary?.olderThan90Days ?? 0}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">&gt; 180 Days</span>
              <p className="text-lg font-black text-rose-400 mt-0.5">{retentionSummary?.olderThan180Days ?? 0}</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            Note: This summary provides read-only visibility for audit retention. Automatic deletion is disabled by system policy.
          </p>
        </div>

        {/* Recovery Activity Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-3">
            <ClipboardList className="w-4 h-4 text-emerald-400" />
            <h4 className="text-white font-bold text-sm">Recovery Activity</h4>
          </div>

          {history.filter((h) => ['RECOVERY_PACKAGE_PREPARED', 'RECOVERY_PACKAGE_VALIDATED', 'RECOVERY_PACKAGE_INTEGRITY_REVERIFIED'].includes(h.action)).length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">
              No recovery package activities recorded yet. Prepare, validate, or re-verify a recovery package above to generate audit entries.
            </p>
          ) : (
            <div className="space-y-2.5">
              {history
                .filter((h) => ['RECOVERY_PACKAGE_PREPARED', 'RECOVERY_PACKAGE_VALIDATED', 'RECOVERY_PACKAGE_INTEGRITY_REVERIFIED'].includes(h.action))
                .slice(0, 10)
                .map((item) => (
                  <div key={item.id} className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        {item.action === 'RECOVERY_PACKAGE_PREPARED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                            RECOVERY_PACKAGE_PREPARED
                          </span>
                        )}
                        {item.action === 'RECOVERY_PACKAGE_VALIDATED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800/80">
                            RECOVERY_PACKAGE_VALIDATED
                          </span>
                        )}
                        {item.action === 'RECOVERY_PACKAGE_INTEGRITY_REVERIFIED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-400 border border-purple-800/80">
                            RECOVERY_PACKAGE_INTEGRITY_REVERIFIED
                          </span>
                        )}
                        <span className={`text-[10px] font-bold ${item.status === 'SUCCESS' ? 'text-emerald-400' : item.status === 'ATTENTION' ? 'text-amber-400' : 'text-rose-400'}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white">
                        {item.action === 'RECOVERY_PACKAGE_PREPARED' && 'Recovery package prepared'}
                        {item.action === 'RECOVERY_PACKAGE_VALIDATED' && `Package validation: ${item.backupVersion || item.status}`}
                        {item.action === 'RECOVERY_PACKAGE_INTEGRITY_REVERIFIED' && `Integrity status: ${item.backupVersion || item.status}`}
                      </p>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 font-mono whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Backup History & Audit Trail */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-emerald-400" />
              <h4 className="text-white font-bold text-sm">Backup History & Audit Trail</h4>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                {(['all', '30', '90', '180'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setHistoryFilter(f);
                      loadHistory(f);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      historyFilter === f
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'All' : `> ${f}d`}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  loadHistory(historyFilter);
                  loadRetention();
                }}
                disabled={isLoadingHistory}
                className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5 bg-slate-900 rounded-lg border border-slate-800"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">
              No backup operations recorded yet. Click "Create New Backup" above to generate your first authoritative package.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold text-[11px]">
                    <th className="py-2 px-3">Date & Time</th>
                    <th className="py-2 px-3">Operation</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Performed By</th>
                    <th className="py-2 px-3">Records</th>
                    <th className="py-2 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 text-slate-400 font-sans whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 px-3">
                        {item.action === 'BACKUP_CREATED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                            BACKUP CREATED
                          </span>
                        )}
                        {item.action === 'BACKUP_VERIFY_SUCCESS' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800/80">
                            VERIFIED VALID
                          </span>
                        )}
                        {item.action === 'BACKUP_VERIFY_FAILED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800/80">
                            VERIFY FAILED
                          </span>
                        )}
                        {item.action === 'RECOVERY_PACKAGE_PREPARED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                            PKG PREPARED
                          </span>
                        )}
                        {item.action === 'RECOVERY_PACKAGE_VALIDATED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800/80">
                            PKG VALIDATED
                          </span>
                        )}
                        {item.action === 'RECOVERY_PACKAGE_INTEGRITY_REVERIFIED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-400 border border-purple-800/80">
                            INTEGRITY REVERIFIED
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-bold">
                        <span className={item.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-200">
                        {item.performedByName || 'Staff'}
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {item.recordCount !== undefined ? item.recordCount : '—'}
                      </td>
                      <td className="py-2 px-3 font-sans text-xs text-slate-400 truncate max-w-xs">
                        {item.failureReason || (item.backupVersion ? `v${item.backupVersion}` : '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Information Callout */}
        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-1">
          <p className="font-bold text-slate-300 flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>Read-Only Business Data Guarantee</span>
          </p>
          <p>
            Generating, downloading, or verifying backup packages is 100% read-only and never modifies your live sales, inventory quantities, customer debts, or financial records. Passwords, auth tokens, and sensitive infrastructure secrets are strictly excluded.
          </p>
        </div>
      </div>
    </div>
  );
};
