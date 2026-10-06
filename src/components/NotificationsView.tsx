import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Boxes,
  FileText,
  Trash2,
  Check,
} from 'lucide-react';
import { api } from '../services/api.js';
import type { AppNotification } from '../types/index.js';

interface NotificationsViewProps {
  onRefreshBadge?: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onRefreshBadge }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      onRefreshBadge?.();
    } catch (err: any) {
      setError(err.message || 'Failed to mark notification read.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      onRefreshBadge?.();
    } catch (err: any) {
      setError(err.message || 'Failed to mark all read.');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
      case 'out_of_stock':
        return <Boxes className="w-4 h-4 text-amber-400" />;
      case 'debt_overdue':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'invoice_overdue':
        return <FileText className="w-4 h-4 text-purple-400" />;
      case 'payment_received':
      case 'sale_completed':
        return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case 'proactive_alert':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Notifications & System Alerts
          </h1>
          <p className="text-xs text-slate-400">
            Real-time triggers for inventory levels, debtor due dates, and transactions
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Notifications List */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-500 animate-pulse">
            Loading alerts...
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition flex items-start justify-between gap-3 ${
                n.read
                  ? 'bg-slate-950/40 border-slate-800/60 opacity-75'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">{n.title}</h4>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                    {new Date(n.createdAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {!n.read && (
                <button
                  onClick={() => handleMarkAsRead(n.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition shrink-0"
                >
                  Mark read
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="py-16 text-center text-slate-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <h4 className="text-sm font-bold text-slate-300">All Caught Up</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              You have no active alerts. Stock reminders and debtor notifications will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
