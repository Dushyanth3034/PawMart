import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, CheckCircle, Clock, DollarSign, 
  TrendingUp, Users, Star, Plus, Box, 
  ShoppingBag, BarChart2, User, Bell, AlertTriangle, FileText, Calendar, Scissors, Sparkles, Check, X
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import PremiumButton from '../ui/PremiumButton';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function DashboardOverview() {
  const { user, accessToken } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  
  const [metrics, setMetrics] = useState({
    totalPetsListed: 0,
    availablePets: 0,
    pendingAdoptionsCount: 0,
    todayMeetingsCount: 0,
    scheduledMeetingsCount: 0,
    completedAdoptionsCount: 0,
    totalServices: 0,
    activeServices: 0,
    inactiveServices: 0,
    todayBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    averageRating: 0.0,
    reviewCount: 0,
    recentReviews: [],
    recentBookings: [],
    salesTrend: { week: [], month: [], year: [] }
  });
  
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('week');

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/provider/dashboard`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      
      const data = response.data.data;
      if (data) {
        setMetrics({
          totalPetsListed: data.totalPetsListed || 0,
          availablePets: data.availablePets || 0,
          pendingAdoptionsCount: data.pendingAdoptionsCount || 0,
          todayMeetingsCount: data.todayMeetingsCount || 0,
          scheduledMeetingsCount: data.scheduledMeetingsCount || 0,
          completedAdoptionsCount: data.completedAdoptionsCount || 0,
          totalServices: data.totalServices || 0,
          activeServices: data.activeServices || 0,
          inactiveServices: data.inactiveServices || 0,
          todayBookings: data.todayBookings || 0,
          upcomingBookings: data.upcomingBookings || 0,
          completedBookings: data.completedBookings || 0,
          cancelledBookings: data.cancelledBookings || 0,
          todayRevenue: data.todayRevenue || 0,
          weeklyRevenue: data.weeklyRevenue || 0,
          monthlyRevenue: data.monthlyRevenue || 0,
          yearlyRevenue: data.yearlyRevenue || 0,
          totalRevenue: data.totalRevenue || 0,
          totalCustomers: data.totalCustomers || 0,
          averageRating: data.averageRating || 5.0,
          reviewCount: data.reviewCount || 0,
          recentReviews: data.recentReviews || [],
          recentBookings: data.recentBookings || [],
          salesTrend: data.salesTrend || { week: [], month: [], year: [] },
          heldPayments: data.heldPayments || 0,
          upcomingPayouts: data.upcomingPayouts || 0
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  const handleTabChange = (tab) => {
    navigate(`/dashboard/provider?tab=${tab}`);
  };

  const handleBookingStatus = async (id, status) => {
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/appointments/${id}`, { status }, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      fetchDashboardData(true);
    } catch (err) {
      alert('Failed to update booking status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const trendBars = metrics.salesTrend[filter] || [];
  const maxRevenue = trendBars.length > 0 ? Math.max(...trendBars.map(d => d.revenue)) : 0;

  return (
    <div className="flex flex-col gap-10">
      
      {/* 1. Header Overview */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold font-outfit text-secondary tracking-tight">
            Welcome back, {user?.firstName}!
          </h2>
          <p className="text-muted font-medium mt-1">Here is how your clinic and pet catalog are performing today.</p>
        </div>
        <div className="flex items-center gap-3">
          <PremiumButton onClick={() => handleTabChange('services')} variant="primary" className="!py-2.5 !px-5 text-sm flex items-center gap-2">
            <Plus size={16} /> New Service
          </PremiumButton>
          <PremiumButton onClick={() => handleTabChange('pets')} variant="secondary" className="!py-2.5 !px-5 text-sm flex items-center gap-2">
            <Plus size={16} /> List Pet
          </PremiumButton>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-primary" /> Bookings & Services
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary/10 text-primary rounded-xl"><Calendar size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.todayBookings}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Today's Bookings</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl"><Clock size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.upcomingBookings}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Upcoming Appointments</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-success/10 text-success rounded-xl"><CheckCircle size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.totalServices}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Total Services</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl"><DollarSign size={20} /></div>
              </div>
              <h4 className="text-2xl font-extrabold text-secondary font-outfit">{formatCurrency(metrics.monthlyRevenue)}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Monthly Revenue (Services)</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-yellow-500/10 text-yellow-600 rounded-xl"><Star size={20} className="fill-current text-yellow-500" /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.averageRating} <span className="text-xs text-muted font-normal">({metrics.reviewCount})</span></h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Rating & Reviews</p>
            </GlassCard>
          </div>
        </div>

        {/* Escrow Overview */}
        <div className="bg-surface border border-black/[0.04] p-5 rounded-3xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-secondary flex items-center gap-2">
              🔒 Platform Escrow Overview
            </h3>
            <span className="text-[10px] font-bold text-muted uppercase">Secured by PawMart</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard className="p-4 border-black/[0.03] bg-blue-50/20">
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Held Payments</p>
              <h4 className="text-xl font-extrabold text-blue-600 font-outfit">{formatCurrency(metrics.heldPayments || 0)}</h4>
            </GlassCard>
            <GlassCard className="p-4 border-black/[0.03] bg-green-50/20">
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Upcoming Payouts</p>
              <h4 className="text-xl font-extrabold text-green-600 font-outfit">{formatCurrency(metrics.upcomingPayouts || 0)}</h4>
            </GlassCard>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
            <Package size={20} className="text-primary" /> Pet Adoptions & Requests
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl"><Package size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.totalPetsListed}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Total Pets Listed</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl"><CheckCircle size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.availablePets}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Available Pets</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-yellow-500/10 text-yellow-600 rounded-xl"><Clock size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.pendingAdoptionsCount}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Pending Adoption Requests</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl"><Calendar size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.scheduledMeetingsCount}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Scheduled Meetings</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-success/10 text-success rounded-xl"><CheckCircle size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.completedAdoptionsCount}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Completed Adoptions</p>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* 3. Performance Charts & Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlassCard className="p-6 h-full border-black/[0.04]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" /> Sales & Bookings Trends
              </h3>
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-surface border border-black/[0.05] rounded-lg px-3 py-1.5 text-sm font-medium outline-none text-secondary"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
            
            <div className="flex items-end gap-2 h-48 w-full mt-4">
              {trendBars.map((day, i) => {
                const heightPercentage = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 5;
                return (
                  <div key={i} className="flex-1 h-full bg-primary/10 rounded-t-sm hover:bg-primary/30 transition-colors relative group flex flex-col justify-end">
                    <div className="w-full bg-primary/80 rounded-t-sm transition-all duration-500" style={{ height: `${Math.max(heightPercentage, 2)}%` }}></div>
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-16 left-1/2 -translate-x-1/2 bg-secondary text-white text-[10px] font-bold py-1.5 px-2.5 rounded-[8px] whitespace-nowrap transition-opacity pointer-events-none z-10 shadow-lg flex flex-col items-center">
                      <span className="text-[9px] text-white/60 mb-0.5">{day.label}</span>
                      <span>Rev: {formatCurrency(day.revenue)}</span>
                      <span>Bookings: {day.bookings || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-4 text-[10px] font-bold text-muted uppercase gap-1">
              {trendBars.map((day, i) => (
                <span key={i} className="text-center flex-1 truncate" title={day.date}>
                  {day.label}
                </span>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="flex flex-col gap-4">
          <GlassCard className="p-6 border-black/[0.04] flex-1 bg-gradient-to-br from-success/5 to-transparent">
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Today's Revenue</p>
            <h4 className="text-3xl font-extrabold text-secondary font-outfit">{formatCurrency(metrics.todayRevenue)}</h4>
          </GlassCard>
          <GlassCard className="p-6 border-black/[0.04] flex-1">
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Weekly Revenue</p>
            <h4 className="text-2xl font-extrabold text-secondary font-outfit">{formatCurrency(metrics.weeklyRevenue)}</h4>
          </GlassCard>
          <GlassCard className="p-6 border-black/[0.04] flex-1">
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Monthly Revenue</p>
            <h4 className="text-2xl font-extrabold text-secondary font-outfit">{formatCurrency(metrics.monthlyRevenue)}</h4>
          </GlassCard>
          <GlassCard className="p-6 border-black/[0.04] flex-1 bg-primary/5">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Lifetime Revenue</p>
            <h4 className="text-2xl font-extrabold text-secondary font-outfit">{formatCurrency(metrics.totalRevenue)}</h4>
          </GlassCard>
        </div>
      </div>

      {/* 4. Top Performing metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-6 border-black/[0.04] flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Completed Adoptions</p>
            <h4 className="text-2xl font-extrabold text-secondary font-outfit">{metrics.completedAdoptionsCount}</h4>
          </div>
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center font-outfit font-bold">❤️</div>
        </GlassCard>

        <GlassCard className="p-6 border-black/[0.04] flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Top Performing Service</p>
            <h4 className="text-2xl font-extrabold text-secondary font-outfit line-clamp-1">{metrics.topPerformingService || 'N/A'}</h4>
          </div>
          <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center font-outfit font-bold">✂️</div>
        </GlassCard>
      </div>

      {/* 5. Recent Booking Requests */}
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
          <Clock size={20} className="text-primary" /> Recent Appointment Requests
        </h3>
        <div className="bg-white border border-black/[0.07] rounded-[24px] overflow-hidden shadow-sm">
          {metrics.recentBookings.length === 0 ? (
            <div className="p-12 text-center text-muted font-medium">No recent bookings found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface border-b border-black/[0.07]">
                    <th className="px-8 py-5 text-xs font-bold text-muted uppercase tracking-wider">Service</th>
                    <th className="px-8 py-5 text-xs font-bold text-muted uppercase tracking-wider">Client & Pet</th>
                    <th className="px-8 py-5 text-xs font-bold text-muted uppercase tracking-wider">Time Slot</th>
                    <th className="px-8 py-5 text-xs font-bold text-muted uppercase tracking-wider">Status</th>
                    <th className="px-8 py-5 text-xs font-bold text-muted uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.03]">
                  {metrics.recentBookings.map(app => (
                    <tr key={app.id} className="hover:bg-orange-50/20 transition-colors">
                      <td className="px-8 py-5 font-bold text-secondary text-sm">{app.serviceName}</td>
                      <td className="px-8 py-5">
                        <p className="font-bold text-secondary text-sm">{app.ownerName}</p>
                        <p className="text-xs font-medium text-muted mt-1">Pet: {app.petName}</p>
                      </td>
                      <td className="px-8 py-5 font-bold text-secondary text-sm tabular-nums">
                        {new Date(app.date).toLocaleDateString()} at {app.time}
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                          app.status === 'COMPLETED' ? 'bg-success/10 text-success' :
                          app.status === 'CANCELLED' || app.status === 'REJECTED' ? 'bg-red-50 text-red-500' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                        {app.status === 'PENDING' && (
                          <>
                            <button onClick={() => handleBookingStatus(app.id, 'ACCEPTED')} className="p-1.5 bg-success/10 text-success rounded-full hover:bg-success hover:text-white transition-colors" title="Accept"><Check size={14} /></button>
                            <button onClick={() => handleBookingStatus(app.id, 'REJECTED')} className="p-1.5 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors" title="Reject"><X size={14} /></button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
