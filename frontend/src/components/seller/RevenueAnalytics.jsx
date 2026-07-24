import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { TrendingUp, DollarSign, Activity } from 'lucide-react';
import GlassCard from '../ui/GlassCard.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function RevenueAnalytics() {
  const { accessToken } = useSelector((state) => state.auth);
  const [data, setData] = useState({ revenue: 0, monthly: 0, salesTrend: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/seller/revenue`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      const responseData = res.data.data || {};
      setData({
        revenue: responseData.totalRevenue || 0,
        monthly: responseData.monthlyRevenue || 0,
        salesTrend: responseData.salesTrends || []
      });
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-muted">Loading analytics...</div>;

  const maxTrendRevenue = data.salesTrend?.length 
    ? Math.max(...data.salesTrend.map(d => d.revenue))
    : 100;
  
  const trendBars = data.salesTrend?.length 
    ? data.salesTrend 
    : Array.from({ length: 6 }).map((_, i) => ({ month: `Month ${i+1}`, revenue: 0 }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-2">Revenue & Analytics</h2>
        <p className="text-muted text-sm">Visualize your sales performance and revenue growth.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard hoverEffect={false} className="p-8 border-black/[0.07] bg-primary/5">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-[16px] bg-primary text-white flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <DollarSign size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Total Lifetime Revenue</p>
              <h3 className="text-4xl font-extrabold font-outfit text-secondary">{formatCurrency(data.revenue)}</h3>
            </div>
          </div>
        </GlassCard>

        <GlassCard hoverEffect={false} className="p-8 border-black/[0.07]">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-[16px] bg-success/10 text-success flex items-center justify-center shrink-0">
              <TrendingUp size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Monthly Revenue</p>
              <h3 className="text-4xl font-extrabold font-outfit text-secondary">{formatCurrency(data.monthly)}</h3>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-8 border-black/[0.07]">
        <h3 className="text-lg font-bold text-secondary mb-6 flex items-center gap-2">
          <Activity size={20} className="text-accent" /> Monthly Sales Trend
        </h3>
        <div className="h-64 flex items-end gap-2 border-b border-l border-black/[0.07] pb-2 pl-2">
          {trendBars.map((monthData, i) => {
            const heightPercentage = maxTrendRevenue > 0 ? (monthData.revenue / maxTrendRevenue) * 100 : 5;
            return (
              <div 
                key={i} 
                className="flex-1 bg-primary/25 hover:bg-primary transition-all duration-300 rounded-t-[8px] relative group cursor-pointer flex flex-col justify-end" 
                style={{ height: `${Math.max(heightPercentage, 2)}%` }}
              >
                <div className="opacity-0 group-hover:opacity-100 absolute -top-16 left-1/2 -translate-x-1/2 bg-secondary text-white text-[10px] font-bold py-1.5 px-2.5 rounded-[8px] whitespace-nowrap transition-opacity pointer-events-none z-10 shadow-lg flex flex-col items-center">
                  <span className="text-[9px] text-white/60 mb-0.5">{monthData.month}</span>
                  <span>{formatCurrency(monthData.revenue)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-4 text-[10px] font-bold text-muted uppercase tracking-wider gap-1">
          {trendBars.map((monthData, i) => (
            <span key={i} className="text-center flex-1 truncate" title={monthData.month}>
              {monthData.month?.split('-')[1] ? new Date(2026, parseInt(monthData.month.split('-')[1], 10) - 1, 1).toLocaleDateString(undefined, { month: 'short' }) : monthData.month}
            </span>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
