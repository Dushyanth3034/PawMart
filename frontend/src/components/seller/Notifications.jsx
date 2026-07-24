import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Bell, Package, AlertTriangle, CreditCard, Star, RefreshCcw, CheckCheck, Inbox } from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../ui/GlassCard.jsx';

const POLL_INTERVAL_MS = 30000; // 30 seconds

export default function Notifications() {
  const { accessToken } = useSelector((state) => state.auth);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const authHeaders = { headers: { Authorization: `Bearer ${accessToken}` }, withCredentials: true };

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/seller/notifications`, authHeaders);
      const data = (res.data.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(data);
    } catch (err) {
      if (!silent) console.error('Failed to fetch notifications:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Lightweight polling every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => fetchNotifications(true), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  const handleMarkRead = async (notif) => {
    if (notif.isRead) return;
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/seller/notifications/${notif.id}/read`, {}, authHeaders);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/seller/notifications/read-all`, {}, authHeaders);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'ORDER':   return <Package size={20} className="text-primary" />;
      case 'STOCK':   return <AlertTriangle size={20} className="text-error" />;
      case 'PAYMENT': return <CreditCard size={20} className="text-success" />;
      case 'REVIEW':  return <Star size={20} className="text-yellow-500" />;
      case 'RETURN':  return <RefreshCcw size={20} className="text-orange-500" />;
      default:        return <Bell size={20} className="text-accent" />;
    }
  };

  const getTypeBadge = (type) => {
    const cfg = {
      ORDER:   { label: 'Order',   color: 'bg-blue-50 text-blue-700' },
      STOCK:   { label: 'Stock',   color: 'bg-red-50 text-red-600' },
      PAYMENT: { label: 'Payment', color: 'bg-green-50 text-green-700' },
      REVIEW:  { label: 'Review',  color: 'bg-yellow-50 text-yellow-700' },
      RETURN:  { label: 'Return',  color: 'bg-orange-50 text-orange-600' },
    };
    const c = cfg[type] || { label: type, color: 'bg-gray-100 text-gray-600' };
    return (
      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.color}`}>
        {c.label}
      </span>
    );
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold font-outfit text-secondary">Notifications</h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-white text-[11px] font-extrabold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <p className="text-muted text-sm mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.`
              : 'All caught up! No unread notifications.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchNotifications()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-bold text-muted border border-black/[0.07] hover:bg-surface hover:text-primary transition-all"
          >
            <RefreshCcw size={13} /> Refresh
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white transition-all disabled:opacity-50"
            >
              <CheckCheck size={13} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-black/[0.07] rounded-[24px] bg-white">
            <Inbox size={48} className="text-gray-300 mb-4" />
            <p className="font-bold text-secondary text-lg">No notifications yet</p>
            <p className="text-muted text-sm mt-1">Notifications will appear here when orders, reviews, and stock events occur.</p>
          </div>
        ) : (
          notifications.map(notif => (
            <button
              key={notif.id}
              onClick={() => handleMarkRead(notif)}
              className={`w-full text-left p-5 rounded-[20px] flex gap-4 border transition-all hover:shadow-sm cursor-pointer ${
                !notif.isRead
                  ? 'bg-primary/[0.04] border-primary/20 hover:bg-primary/[0.07]'
                  : 'bg-white border-black/[0.06] hover:bg-surface'
              }`}
            >
              {/* Icon bubble */}
              <div className="w-11 h-11 shrink-0 rounded-full bg-white border border-black/[0.07] shadow-sm flex items-center justify-center">
                {getIcon(notif.type)}
              </div>

              {/* Content */}
              <div className="flex-grow min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-secondary text-sm leading-snug">{notif.title}</h4>
                    {getTypeBadge(notif.type)}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" title="Unread" />
                    )}
                    <span className="text-[10px] font-bold text-muted whitespace-nowrap">{timeAgo(notif.createdAt)}</span>
                  </div>
                </div>
                <p className="text-sm text-secondary/80 font-medium leading-relaxed">{notif.message}</p>
                <span className="text-[10px] text-muted mt-2 block">
                  {new Date(notif.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
