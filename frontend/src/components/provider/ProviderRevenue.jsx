import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { DollarSign, Download, ArrowUpRight, BarChart2, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../ui/GlassCard.jsx';
import PremiumButton from '../ui/PremiumButton.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function ProviderRevenue() {
  const { accessToken } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    totalRevenue: 0,
    recentTransactions: [],
    completedAppointments: [],
    salesTrend: { week: [], month: [], year: [] },
    totalListingFeesPaid: 0,
    premiumListingsPurchasedCount: 0,
    recentListingPayments: [],
    totalPetsListed: 0,
    availablePets: 0,
    completedAdoptionsCount: 0
  });
  const [filter, setFilter] = useState('week');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/provider/dashboard`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        if (response.data?.data) {
          setData(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching revenue stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [accessToken]);

  const downloadReport = () => {
    // Generate simple CSV content of revenue trend
    const trend = data.salesTrend[filter] || [];
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Label,Revenue,Bookings\n';
    trend.forEach(row => {
      csvContent += `${row.date || ''},${row.label || ''},${row.revenue || 0},${row.bookings || 0}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `revenue_report_${filter}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Revenue report downloaded ✨');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentTrend = data.salesTrend[filter] || [];
  const maxVal = currentTrend.length > 0 ? Math.max(...currentTrend.map(d => d.revenue)) : 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Revenue</h2>
          <p className="text-sm text-gray-500">Analyze billing performance and service earnings.</p>
        </div>
        {data.totalRevenue > 0 && (
          <PremiumButton onClick={downloadReport} className="flex items-center space-x-2">
            <Download size={16} />
            <span>Export Report</span>
          </PremiumButton>
        )}
      </div>

      {/* Provider Earnings section */}
      {data.totalRevenue > 0 ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-6 border-black/[0.04] bg-gradient-to-br from-orange-50 to-transparent">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Today's Sales</p>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{formatCurrency(data.todayRevenue)}</h4>
            </GlassCard>
            <GlassCard className="p-6 border-black/[0.04]">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Weekly Earnings</p>
              <h4 className="text-2xl font-extrabold text-secondary font-outfit">{formatCurrency(data.weeklyRevenue)}</h4>
            </GlassCard>
            <GlassCard className="p-6 border-black/[0.04]">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Monthly Billing</p>
              <h4 className="text-2xl font-extrabold text-secondary font-outfit">{formatCurrency(data.monthlyRevenue)}</h4>
            </GlassCard>
            <GlassCard className="p-6 border-black/[0.04]">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Yearly Revenue</p>
              <h4 className="text-2xl font-extrabold text-secondary font-outfit">{formatCurrency(data.yearlyRevenue)}</h4>
            </GlassCard>
          </div>

          {/* Graphical Chart */}
          <GlassCard className="p-6 border-black/[0.04]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" /> Revenue Visualizer
              </h3>
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-surface border border-black/[0.05] rounded-lg px-3 py-1.5 text-sm font-medium outline-none text-secondary"
              >
                <option value="week">Weekly View</option>
                <option value="month">Monthly View</option>
                <option value="year">Annual View</option>
              </select>
            </div>

            <div className="flex items-end gap-2 h-56 w-full mt-4">
              {currentTrend.map((day, i) => {
                const heightPercentage = maxVal > 0 ? (day.revenue / maxVal) * 100 : 5;
                return (
                  <div key={i} className="flex-1 h-full bg-primary/10 rounded-t-sm hover:bg-primary/20 transition-colors relative group flex flex-col justify-end">
                    <div className="w-full bg-primary/80 rounded-t-md transition-all duration-500" style={{ height: `${Math.max(heightPercentage, 2)}%` }}></div>
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-secondary text-white text-[10px] font-bold py-1.5 px-2.5 rounded-[8px] whitespace-nowrap transition-opacity pointer-events-none z-10 shadow-lg">
                      {day.label}: {formatCurrency(day.revenue)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-4 text-[10px] font-bold text-muted uppercase gap-1">
              {currentTrend.map((day, i) => (
                <span key={i} className="text-center flex-1 truncate" title={day.date}>
                  {day.label}
                </span>
              ))}
            </div>
          </GlassCard>

          {/* Platform Escrow Metrics */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
              Platform Escrow Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <GlassCard className="p-4 border-black/[0.04] bg-blue-50/10">
                <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1">Held Payments</p>
                <h4 className="text-lg font-extrabold text-blue-600 font-outfit">{formatCurrency(data.heldPayments || 0)}</h4>
              </GlassCard>
              <GlassCard className="p-4 border-black/[0.04] bg-amber-50/10">
                <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1">Pending Confirms</p>
                <h4 className="text-lg font-extrabold text-amber-600 font-outfit">{data.pendingConfirmations || 0}</h4>
              </GlassCard>
              <GlassCard className="p-4 border-black/[0.04] bg-green-50/10">
                <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1">Upcoming Payouts</p>
                <h4 className="text-lg font-extrabold text-green-600 font-outfit">{formatCurrency(data.upcomingPayouts || 0)}</h4>
              </GlassCard>
              <GlassCard className="p-4 border-black/[0.04] bg-emerald-50/10">
                <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1">Released Payments</p>
                <h4 className="text-lg font-extrabold text-emerald-600 font-outfit">{formatCurrency(data.releasedPayments || 0)}</h4>
              </GlassCard>
              <GlassCard className="p-4 border-black/[0.04] bg-red-50/10">
                <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1">Refunded Payments</p>
                <h4 className="text-lg font-extrabold text-red-500 font-outfit">{formatCurrency(data.refundedPayments || 0)}</h4>
              </GlassCard>
              <GlassCard className="p-4 border-black/[0.04] bg-rose-50/10">
                <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1">Disputed Payments</p>
                <h4 className="text-lg font-extrabold text-rose-600 font-outfit">{formatCurrency(data.disputedPayments || 0)}</h4>
              </GlassCard>
            </div>
          </div>

          {/* Transaction Logs Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Transactions */}
            <GlassCard className="p-6 border-black/[0.04] lg:col-span-2">
              <h3 className="text-md font-bold text-secondary mb-4">Recent Escrow Transactions</h3>
              <div className="space-y-3">
                {data.recentEscrowTransactions?.length > 0 ? (
                  data.recentEscrowTransactions.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center py-2.5 border-b border-black/[0.03]">
                      <div>
                        <h5 className="font-semibold text-secondary text-sm">{tx.type} ({tx.paymentMethod})</h5>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Reference: {tx.transactionId}</p>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{new Date(tx.paymentDate).toLocaleDateString()} at {new Date(tx.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-secondary text-sm">{formatCurrency(tx.amount)}</p>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          tx.status === 'RELEASED' || tx.status === 'COMPLETED' ? 'bg-success/10 text-success' :
                          tx.status === 'HELD' ? 'bg-blue-100 text-blue-800' :
                          tx.status === 'ON_HOLD' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-50 text-red-500'
                        }`}>{tx.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-6 text-sm">No escrow transactions found.</p>
                )}
              </div>
            </GlassCard>

            {/* Recent Payouts */}
            <GlassCard className="p-6 border-black/[0.04]">
              <h3 className="text-md font-bold text-secondary mb-4">Recent Payouts</h3>
              <div className="space-y-3">
                {data.recentPayouts?.length > 0 ? (
                  data.recentPayouts.map((p) => (
                    <div key={p.id} className="flex justify-between items-center py-2.5 border-b border-black/[0.03]">
                      <div>
                        <h5 className="font-semibold text-secondary text-sm">Bank Transfer Payout</h5>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Ref: {p.transactionId}</p>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{new Date(p.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-secondary text-sm">{formatCurrency(p.amount)}</p>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${p.status === 'COMPLETED' ? 'bg-success/10 text-success' : 'bg-amber-100 text-amber-800'}`}>{p.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-6 text-sm">No payouts generated yet.</p>
                )}
              </div>
            </GlassCard>
          </div>
        </>
      ) : (
        /* Professional Empty State */
        <GlassCard className="p-8 border-black/[0.04] bg-gradient-to-br from-orange-50/20 to-transparent flex flex-col items-center text-center max-w-2xl mx-auto my-6">
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-primary mb-4 shrink-0">
            <DollarSign size={32} />
          </div>
          <h3 className="text-lg font-bold text-secondary">No provider earnings available yet.</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-sm">
            When you accept and complete paid vet clinic or grooming appointments, your live financial insights will show up here.
          </p>
        </GlassCard>
      )}

      {/* Listing & Adoption Metrics */}
      <div className="space-y-4">
        <h3 className="text-md font-bold text-secondary tracking-wide uppercase text-xs font-bold text-muted">
          Listing & Adoption Metrics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlassCard className="p-6 border-black/[0.04]">
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Total Pets Listed</p>
            <h4 className="text-2xl font-extrabold text-secondary font-outfit">{data.totalPetsListed || 0}</h4>
          </GlassCard>
          <GlassCard className="p-6 border-black/[0.04]">
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Active Adoption Listings</p>
            <h4 className="text-2xl font-extrabold text-secondary font-outfit">{data.availablePets || 0}</h4>
          </GlassCard>
          <GlassCard className="p-6 border-black/[0.04]">
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Completed Adoptions</p>
            <h4 className="text-2xl font-extrabold text-secondary font-outfit">{data.completedAdoptionsCount || 0}</h4>
          </GlassCard>
        </div>
      </div>

      {/* Premium Listing Payments (Informational Platform Fees) */}
      <GlassCard className="p-6 border-black/[0.04]">
        <h3 className="text-lg font-bold text-secondary mb-2 flex items-center gap-2">
          💳 Premium Listing Payments
        </h3>
        <p className="text-xs text-gray-500 mb-6 font-medium">Informational only. Listing fees paid by the provider to the platform for active listings activation.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-surface p-5 rounded-2xl border border-black/[0.03]">
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Total Listing Fees Paid</p>
            <h4 className="text-2xl font-extrabold text-secondary font-outfit">{formatCurrency(data.totalListingFeesPaid || 0)}</h4>
          </div>
          <div className="bg-surface p-5 rounded-2xl border border-black/[0.03]">
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Premium Listings Purchased</p>
            <h4 className="text-2xl font-extrabold text-secondary font-outfit">{data.premiumListingsPurchasedCount || 0} listings</h4>
          </div>
        </div>

        <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Recent Listing Payments</h4>
        <div className="space-y-3">
          {data.recentListingPayments?.length > 0 ? (
            data.recentListingPayments.map((p) => (
              <div key={p.id} className="flex justify-between items-center py-2.5 border-b border-black/[0.03]">
                <div>
                  <h5 className="font-semibold text-secondary text-sm">Premium Listing Activation ({p.paymentMethod})</h5>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">ID: {p.transactionId}</p>
                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{new Date(p.paymentDate).toLocaleDateString()} at {new Date(p.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-secondary text-sm">{formatCurrency(p.amount)}</p>
                  <p className="text-[10px] text-success font-bold uppercase tracking-wider">{p.status}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-6 text-sm">No premium listing payments found.</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
