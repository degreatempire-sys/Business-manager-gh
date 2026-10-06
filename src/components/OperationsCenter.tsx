import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Sliders,
  Calendar,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  Inbox,
  User,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api.js';
import type {
  BusinessTask,
  TaskPriority,
  TaskSource,
  AutomationRules,
  OperationsCenterSummary,
  Business,
} from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';

interface OperationsCenterProps {
  business: Business | null;
  onNavigate: (view: string) => void;
}

export const OperationsCenter: React.FC<OperationsCenterProps> = ({
  business,
  onNavigate,
}) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<OperationsCenterSummary | null>(null);
  const [tasks, setTasks] = useState<BusinessTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'today' | 'my' | 'completed'>('all');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Modals
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('normal');
  const [newDueDate, setNewDueDate] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Rules form states
  const [rulesForm, setRulesForm] = useState<AutomationRules | null>(null);
  const [savingRules, setSavingRules] = useState(false);

  const isOwnerOrAdmin = user?.role === 'business_owner' || user?.role === 'master_admin';

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, taskRes] = await Promise.all([
        api.getWorkflowsSummary(),
        api.getTasks({ status: activeFilter === 'completed' ? 'completed' : 'active' }),
      ]);
      setSummary(sumRes);
      setTasks(taskRes);
    } catch (err: any) {
      console.error('Failed to load operations data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeFilter]);

  const handleEvaluate = async () => {
    try {
      setEvaluating(true);
      setFeedback(null);
      const res = await api.evaluateWorkflows();
      setFeedback({
        message: `Evaluation complete. Generated ${res.generatedCount} new task(s). Total active: ${res.existingActiveCount}.`,
        type: 'success',
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        message: err.message || 'Failed to evaluate workflows.',
        type: 'error',
      });
    } finally {
      setEvaluating(false);
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      await api.completeTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (summary) {
        setSummary({
          ...summary,
          totalPending: Math.max(0, summary.totalPending - 1),
          completedCount: summary.completedCount + 1,
        });
      }
      setFeedback({ message: 'Task marked as completed.', type: 'success' });
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to complete task.', type: 'error' });
    }
  };

  const handleSnooze = async (taskId: string) => {
    try {
      await api.snoozeTask(taskId, 24);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setFeedback({ message: 'Task snoozed for 24 hours.', type: 'info' });
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to snooze task.', type: 'error' });
    }
  };

  const handleDismiss = async (taskId: string) => {
    try {
      await api.dismissTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setFeedback({ message: 'Task dismissed.', type: 'info' });
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to dismiss task.', type: 'error' });
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setCreatingTask(true);
      const created = await api.createTask({
        title: newTitle.trim(),
        description: newDesc.trim(),
        priority: newPriority,
        dueDate: newDueDate || undefined,
      });
      setShowNewTaskModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewPriority('normal');
      setNewDueDate('');
      setFeedback({ message: `Task "${created.title}" created successfully.`, type: 'success' });
      await loadData();
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to create task.', type: 'error' });
    } finally {
      setCreatingTask(false);
    }
  };

  const handleOpenRules = async () => {
    try {
      const r = await api.getAutomationRules();
      setRulesForm(r);
      setShowRulesModal(true);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to load rules.', type: 'error' });
    }
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rulesForm) return;

    try {
      setSavingRules(true);
      const updated = await api.updateAutomationRules(rulesForm);
      setRulesForm(updated);
      setShowRulesModal(false);
      setFeedback({ message: 'Operational automation rules updated.', type: 'success' });
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to update rules.', type: 'error' });
    } finally {
      setSavingRules(false);
    }
  };

  // Filter tasks in memory according to active filter
  const displayedTasks = tasks.filter((task) => {
    if (activeFilter === 'critical') {
      return task.priority === 'critical' || task.priority === 'high';
    }
    if (activeFilter === 'today') {
      return task.dueDate === new Date().toISOString().split('T')[0];
    }
    if (activeFilter === 'my') {
      return task.assignedToId === user?.id;
    }
    return true;
  });

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'high':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'normal':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'low':
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-700';
    }
  };

  return (
    <div id="operations-center-widget" className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">Operations Center & Workflows</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 uppercase tracking-wider">
              Controlled
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated operational guidance, restock checkpoints, and collections follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
            title="Scan inventory, debt, customer, and expense systems for actionable follow-ups"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : ''}`} />
            {evaluating ? 'Evaluating...' : 'Evaluate Workflows'}
          </button>

          <button
            onClick={() => setShowNewTaskModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
            New Task
          </button>

          {isOwnerOrAdmin && (
            <button
              onClick={handleOpenRules}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition border border-slate-700"
              title="Configure Automation Thresholds"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Banner feedback */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
              : feedback.type === 'error'
              ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
              : 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white ml-2 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Executive Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3">
          <span className="text-[11px] font-semibold text-slate-400 block">Pending Tasks</span>
          <span className="text-xl font-black text-white mt-0.5 block">{summary?.totalPending ?? 0}</span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3">
          <span className="text-[11px] font-semibold text-slate-400 block">Due Today</span>
          <span className="text-xl font-black text-cyan-400 mt-0.5 block">{summary?.dueToday ?? 0}</span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3">
          <span className="text-[11px] font-semibold text-slate-400 block">Overdue Follow-ups</span>
          <span className={`text-xl font-black mt-0.5 block ${(summary?.overdue ?? 0) > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            {summary?.overdue ?? 0}
          </span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3">
          <span className="text-[11px] font-semibold text-slate-400 block">Critical Attention</span>
          <span className={`text-xl font-black mt-0.5 block ${(summary?.critical ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {summary?.critical ?? 0}
          </span>
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3 overflow-x-auto text-xs">
        {[
          { id: 'all', label: 'All Active' },
          { id: 'critical', label: 'Critical & High' },
          { id: 'today', label: 'Due Today' },
          { id: 'my', label: 'Assigned to Me' },
          { id: 'completed', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap ${
              activeFilter === tab.id
                ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-8 text-center text-slate-500 text-xs">Loading operational workflows...</div>
        ) : displayedTasks.length > 0 ? (
          displayedTasks.map((task) => (
            <div
              key={task.id}
              className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getPriorityBadge(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                    {task.source}
                  </span>
                  {task.dueDate && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      Due {task.dueDate}
                    </span>
                  )}
                  {task.assignedToName && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      {task.assignedToName}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white truncate">{task.title}</h3>
                <p className="text-xs text-slate-300 line-clamp-2">{task.description}</p>

                {task.evidence && (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1 text-[11px] text-slate-400 inline-block">
                    <span className="text-slate-300 font-semibold">{task.evidence.metricLabel || 'Evidence'}:</span>{' '}
                    {task.evidence.currentValue !== undefined && String(task.evidence.currentValue)}{' '}
                    {task.evidence.details && <span className="text-slate-500">({task.evidence.details})</span>}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {task.actionUrl && (
                  <button
                    onClick={() => onNavigate(task.actionUrl!.replace(/^\//, ''))}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition"
                  >
                    <span>{task.actionLabel || 'View Record'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}

                {task.status !== 'completed' && (
                  <>
                    <button
                      onClick={() => handleComplete(task.id)}
                      className="p-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 hover:bg-emerald-800 text-emerald-400 transition"
                      title="Mark task as complete"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSnooze(task.id)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition border border-slate-700"
                      title="Snooze 24 hours"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDismiss(task.id)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition border border-slate-700"
                      title="Dismiss task"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-slate-500 space-y-2">
            <Inbox className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs font-semibold text-slate-300">All caught up!</p>
            <p className="text-[11px] text-slate-500">
              No active operational tasks pending. Click &quot;Evaluate Workflows&quot; to scan current business data.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Create Manual Task */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create Operational Task</h3>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audit Friday Milk Stock"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Specify task actions, items, or context..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask || !newTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition disabled:opacity-50"
                >
                  {creatingTask ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Automation Rules */}
      {showRulesModal && rulesForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Workflow & Automation Rules
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRules} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Stock Coverage Alert (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={rulesForm.stockCoverageDaysThreshold}
                    onChange={(e) =>
                      setRulesForm({ ...rulesForm, stockCoverageDaysThreshold: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                  <span className="text-[10px] text-slate-500">Flags fast movers with coverage below this</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Customer Inactivity Alert (Days)
                  </label>
                  <input
                    type="number"
                    min={7}
                    max={180}
                    value={rulesForm.customerInactivityDaysThreshold}
                    onChange={(e) =>
                      setRulesForm({ ...rulesForm, customerInactivityDaysThreshold: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                  <span className="text-[10px] text-slate-500">Flags VIPs with no purchases for X days</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rulesForm.minStockRestockAlert}
                    onChange={(e) => setRulesForm({ ...rulesForm, minStockRestockAlert: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-cyan-500"
                  />
                  <span className="text-slate-300 font-medium">Generate alert when stock reaches reorder level</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rulesForm.enableDailyReview}
                    onChange={(e) => setRulesForm({ ...rulesForm, enableDailyReview: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-cyan-500"
                  />
                  <span className="text-slate-300 font-medium">Generate scheduled Daily Operations Review task</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rulesForm.autoNotifyStaff}
                    onChange={(e) => setRulesForm({ ...rulesForm, autoNotifyStaff: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-cyan-500"
                  />
                  <span className="text-slate-300 font-medium">Send notification when critical tasks are created</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRulesModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRules}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition disabled:opacity-50"
                >
                  {savingRules ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
