import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Activity, ThumbsUp, ThumbsDown, PackageCheck, Clock } from 'lucide-react';
import GlassCard from '../ui/GlassCard.jsx';

export default function Performance() {
  const { accessToken } = useSelector((state) => state.auth);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/seller/performance`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setMetrics(res.data.data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-muted">Loading performance metrics...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-2">Seller Performance</h2>
        <p className="text-muted text-sm">Key metrics impacting your store's visibility and reputation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="p-6 border-black/[0.07]">
          <div className="w-12 h-12 rounded-[16px] bg-success/10 text-success flex items-center justify-center mb-4">
            <PackageCheck size={20} />
          </div>
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Fulfilment Rate</p>
          <h3 className="text-3xl font-extrabold text-secondary">{metrics?.fulfilmentRate || '100'}%</h3>
        </GlassCard>

        <GlassCard className="p-6 border-black/[0.07]">
          <div className="w-12 h-12 rounded-[16px] bg-error/10 text-error flex items-center justify-center mb-4">
            <ThumbsDown size={20} />
          </div>
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Cancellation Rate</p>
          <h3 className="text-3xl font-extrabold text-secondary">{metrics?.cancellationRate || '0'}%</h3>
        </GlassCard>

        <GlassCard className="p-6 border-black/[0.07]">
          <div className="w-12 h-12 rounded-[16px] bg-accent/20 text-accent flex items-center justify-center mb-4">
            <Clock size={20} />
          </div>
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Avg. Delivery Time</p>
          <h3 className="text-3xl font-extrabold text-secondary">{metrics?.avgDeliveryDays || '2.5'} <span className="text-sm">Days</span></h3>
        </GlassCard>

        <GlassCard className="p-6 border-black/[0.07]">
          <div className="w-12 h-12 rounded-[16px] bg-primary/10 text-primary flex items-center justify-center mb-4">
            <ThumbsUp size={20} />
          </div>
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Customer Satisfaction</p>
          <h3 className="text-3xl font-extrabold text-secondary">{metrics?.customerSatisfaction || '98'}%</h3>
        </GlassCard>
      </div>
    </div>
  );
}
