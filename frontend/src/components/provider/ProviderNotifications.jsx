import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Bell, Package, AlertTriangle, CreditCard, Star } from 'lucide-react';
import GlassCard from '../ui/GlassCard.jsx';

export default function ProviderNotifications() {
  const { accessToken } = useSelector((state) => state.auth);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/provider/notifications`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setNotifications(res.data.data || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'ORDER': return <Package size={20} className="text-primary" />;
      case 'STOCK': return <AlertTriangle size={20} className="text-error" />;
      case 'PAYMENT': return <CreditCard size={20} className="text-success" />;
      case 'REVIEW': return <Star size={20} className="text-yellow-500" />;
      default: return <Bell size={20} className="text-accent" />;
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-2">Notifications</h2>
        <p className="text-muted text-sm">Stay updated on booking requests, alerts, and customer reviews.</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-muted">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="bg-white p-8 rounded-[24px] text-center text-muted font-medium border border-black/[0.07]">
            You're all caught up!
          </div>
        ) : (
          notifications.map(notif => (
            <GlassCard key={notif.id} hoverEffect={false} className={`p-5 flex gap-4 border-black/[0.07] ${!notif.isRead ? 'bg-primary/5' : ''}`}>
              <div className="w-12 h-12 shrink-0 rounded-full bg-white border border-black/[0.07] flex items-center justify-center">
                {getIcon(notif.type)}
              </div>
              <div className="flex-grow">
                <h4 className="font-bold text-secondary">{notif.title}</h4>
                <p className="text-sm text-secondary font-medium mt-1">{notif.message}</p>
                <span className="text-xs font-bold text-muted mt-3 block">
                  {new Date(notif.createdAt).toLocaleString()}
                </span>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}
