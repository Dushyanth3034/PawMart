import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, CheckCircle, Clock, DollarSign, 
  TrendingUp, Users, Star, Plus, Box, 
  ShoppingBag, BarChart2, User, Bell, AlertTriangle, FileText, Activity
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import PremiumButton from '../ui/PremiumButton';
import { getFullImageUrl } from '../../utils/imageHelper.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function DashboardOverview() {
  const { user, accessToken } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    activeProducts: 0,
    draftProducts: 0,
    outOfStockProducts: 0,
    pendingOrders: 0,
    acceptedOrders: 0,
    packedOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    todayRevenue: 0,
    todayOrders: 0,
    todayCustomers: 0,
    todayReviews: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    averageRating: 0,
    totalReviews: 0,
    salesTrend: { week: [], month: [], year: [] },
    recentOrders: [],
    lowStockProducts: [],
    recentReviews: [],
    notifications: []
  });
  
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('week');

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/seller/dashboard`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      
      const data = response.data.data || response.data;
      setMetrics({
        totalProducts: data.totalProducts || 0,
        activeProducts: data.activeProducts || 0,
        draftProducts: data.draftProducts || 0,
        outOfStockProducts: data.outOfStockProducts || 0,
        pendingOrders: data.pendingOrders || 0,
        acceptedOrders: data.acceptedOrders || 0,
        packedOrders: data.packedOrders || 0,
        shippedOrders: data.shippedOrders || 0,
        deliveredOrders: data.deliveredOrders || 0,
        cancelledOrders: data.cancelledOrders || 0,
        todayRevenue: data.todayRevenue || 0,
        todayOrders: data.todayOrders || 0,
        todayCustomers: data.todayCustomers || 0,
        todayReviews: data.todayReviews || 0,
        weeklyRevenue: data.weeklyRevenue || 0,
        monthlyRevenue: data.monthlyRevenue || 0,
        totalRevenue: data.totalRevenue || 0,
        totalCustomers: data.totalCustomers || 0,
        averageRating: data.averageRating || 0,
        totalReviews: data.totalReviews || 0,
        salesTrend: data.salesTrend || { week: [], month: [], year: [] },
        recentOrders: data.recentOrders || [],
        lowStockProducts: data.lowStockProducts || [],
        recentReviews: data.recentReviews || [],
        notifications: data.notifications || []
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  useEffect(() => {
    const handleDataChanged = () => {
      fetchDashboardData(true);
    };
    window.addEventListener('seller-data-changed', handleDataChanged);

    // Background polling every 5 seconds for live dashboard updates
    const pollInterval = setInterval(() => {
      fetchDashboardData(true);
    }, 5000);

    return () => {
      window.removeEventListener('seller-data-changed', handleDataChanged);
      clearInterval(pollInterval);
    };
  }, [fetchDashboardData]);

  const handleTabChange = (tab) => {
    navigate(`/seller/home?tab=${tab}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Extract active trend based on filter
  const activeTrend = metrics.salesTrend?.[filter] || [];

  const maxRevenue = activeTrend.length 
    ? Math.max(...activeTrend.map(d => d.revenue))
    : 100;
  
  const trendBars = activeTrend.length 
    ? activeTrend 
    : Array.from({ length: 7 }).map((_, i) => ({ date: `Day ${i+1}`, label: `D${i+1}`, revenue: 0, orders: 0 }));

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Welcome Hero */}
      <GlassCard className="p-8 border-black/[0.05] bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Store Logo" className="w-16 h-16 rounded-[16px] object-cover shadow-sm border border-black/[0.05]" />
            ) : (
              <div className="w-16 h-16 rounded-[16px] bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                {user?.firstName?.charAt(0) || 'S'}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-muted uppercase tracking-wider mb-1">Welcome back, Seller!</p>
              <h2 className="text-3xl font-extrabold font-outfit text-secondary">{user?.firstName} {user?.lastName}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
                <span className="text-xs font-bold text-success uppercase tracking-wider">Store Active</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PremiumButton onClick={() => handleTabChange('products')} variant="primary" className="!py-2.5 !px-5 flex items-center gap-2 text-sm">
              <Plus size={16} /> Add Product
            </PremiumButton>
            <PremiumButton onClick={() => handleTabChange('orders')} variant="secondary" className="!py-2.5 !px-5 flex items-center gap-2 text-sm">
              <ShoppingBag size={16} /> View Orders
            </PremiumButton>
          </div>
        </div>
      </GlassCard>

      {/* 2. Business Overview Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
            <BarChart2 size={20} className="text-primary" /> Store Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard hoverEffect className="p-5 border-black/[0.04] bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary/10 text-primary rounded-xl"><Users size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.totalCustomers}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Total Customers</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-5 border-black/[0.04] bg-gradient-to-br from-success/5 to-transparent">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-success/10 text-success rounded-xl"><DollarSign size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{formatCurrency(metrics.totalRevenue)}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Lifetime Revenue</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-5 border-black/[0.04] bg-gradient-to-br from-yellow-500/5 to-transparent">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-yellow-500/10 text-yellow-600 rounded-xl"><Star size={20} className="fill-current" /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{Number(metrics.averageRating || 0).toFixed(1)} <span className="text-sm font-medium text-muted">/ 5.0</span></h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Store Rating ({metrics.totalReviews} reviews)</p>
            </GlassCard>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
            <Activity size={20} className="text-primary" /> Today's Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard hoverEffect className="p-5 border-black/[0.04] bg-gradient-to-br from-success/5 to-transparent">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-success/10 text-success rounded-xl"><DollarSign size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{formatCurrency(metrics.todayRevenue)}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Today's Revenue</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl"><ShoppingBag size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.todayOrders}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Today's Orders</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl"><Users size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.todayCustomers}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Today's Customers</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-yellow-500/10 text-yellow-600 rounded-xl"><Star size={20} className="fill-current text-yellow-500" /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.todayReviews}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Today's Reviews</p>
            </GlassCard>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
            <Package size={20} className="text-primary" /> Product Catalog
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl"><Package size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.totalProducts}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Total Products</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-success/10 text-success rounded-xl"><CheckCircle size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.activeProducts}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Active Products</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-gray-500/10 text-gray-600 rounded-xl"><FileText size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.draftProducts}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Draft Products</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-5 border-black/[0.04]">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-red-500/10 text-red-600 rounded-xl"><AlertTriangle size={20} /></div>
              </div>
              <h4 className="text-3xl font-extrabold text-secondary font-outfit">{metrics.outOfStockProducts}</h4>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Out of Stock</p>
            </GlassCard>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
            <ShoppingBag size={20} className="text-primary" /> Order Fulfillment
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <GlassCard hoverEffect className="p-4 border-black/[0.04]">
              <h4 className="text-2xl font-extrabold text-secondary font-outfit">{metrics.pendingOrders}</h4>
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mt-1">Pending</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-4 border-black/[0.04]">
              <h4 className="text-2xl font-extrabold text-blue-600 font-outfit">{metrics.acceptedOrders}</h4>
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mt-1">Accepted</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-4 border-black/[0.04]">
              <h4 className="text-2xl font-extrabold text-indigo-600 font-outfit">{metrics.packedOrders}</h4>
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mt-1">Packed</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-4 border-black/[0.04]">
              <h4 className="text-2xl font-extrabold text-purple-600 font-outfit">{metrics.shippedOrders}</h4>
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mt-1">Shipped</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-4 border-black/[0.04]">
              <h4 className="text-2xl font-extrabold text-success font-outfit">{metrics.deliveredOrders}</h4>
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mt-1">Delivered</p>
            </GlassCard>

            <GlassCard hoverEffect className="p-4 border-black/[0.04]">
              <h4 className="text-2xl font-extrabold text-red-500 font-outfit">{metrics.cancelledOrders}</h4>
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mt-1">Cancelled</p>
            </GlassCard>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. Sales Performance */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 h-full border-black/[0.04]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" /> Sales Performance
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
                      <span>Orders: {day.orders || 0}</span>
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

        {/* 8. Revenue Summary */}
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

      {/* 4. Quick Actions */}
      <div>
        <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
          <FileText size={20} className="text-primary" /> Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { id: 'products', icon: Package, label: 'Add Product' },
            { id: 'inventory', icon: Box, label: 'Inventory' },
            { id: 'orders', icon: ShoppingBag, label: 'Orders' },
            { id: 'revenue', icon: BarChart2, label: 'Analytics' },
            { id: 'profile', icon: User, label: 'Store Profile' },
            { id: 'reviews', icon: Star, label: 'Reviews' }
          ].map((action) => (
            <button 
              key={action.id}
              onClick={() => handleTabChange(action.id)}
              className="flex flex-col items-center justify-center gap-3 p-5 bg-white border border-black/[0.04] rounded-2xl hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-muted group-hover:bg-primary group-hover:text-white transition-colors">
                <action.icon size={20} />
              </div>
              <span className="text-xs font-bold text-secondary tracking-wide">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5. Recent Orders */}
        <GlassCard className="p-6 border-black/[0.04]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-secondary">Recent Orders</h3>
            <button onClick={() => handleTabChange('orders')} className="text-xs font-bold text-primary hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {metrics.recentOrders?.length > 0 ? (
              metrics.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 rounded-xl border border-black/[0.03] hover:bg-surface transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-surface border border-black/[0.05] overflow-hidden">
                      {order.product?.images?.[0]?.url ? (
                        <img src={getFullImageUrl(order.product.images[0].url)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center"><Package size={16} className="text-gray-400" /></div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-secondary line-clamp-1">{order.product?.name || 'Unknown Product'}</p>
                      <p className="text-xs text-muted mt-0.5">Order #{order.orderId?.slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-secondary">{formatCurrency((order.price || 0) * (order.quantity || 0))}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-amber-100 text-amber-700 mt-1 inline-block">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-surface mx-auto flex items-center justify-center mb-3">
                  <ShoppingBag size={20} className="text-muted" />
                </div>
                <p className="text-sm font-medium text-muted">No orders yet.</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* 6. Low Stock Alerts & 9. Notifications */}
        <div className="space-y-6">
          <GlassCard className="p-6 border-black/[0.04]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" /> Low Stock Alerts
              </h3>
              <button onClick={() => handleTabChange('inventory')} className="text-xs font-bold text-primary hover:underline">Manage</button>
            </div>
            <div className="space-y-3">
              {metrics.lowStockProducts?.length > 0 ? (
                metrics.lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-100/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-black/[0.05]">
                        {product.images?.[0]?.url ? (
                          <img src={getFullImageUrl(product.images[0].url)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center"><Package size={14} className="text-gray-400" /></div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-secondary line-clamp-1">{product.name}</p>
                        <p className="text-xs text-amber-600 font-medium">Only {product.inventory?.quantity || 0} left in stock</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm font-medium text-success flex items-center justify-center gap-2">
                    <CheckCircle size={16} /> Inventory is healthy.
                  </p>
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-6 border-black/[0.04]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
                <Bell size={18} className="text-primary" /> Notifications
              </h3>
              <button onClick={() => handleTabChange('notifications')} className="text-xs font-bold text-primary hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {metrics.notifications?.length > 0 ? (
                metrics.notifications.map((notif) => (
                  <div key={notif.id} className="flex gap-4">
                    <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${notif.isRead ? 'bg-gray-300' : 'bg-primary'}`} />
                    <div>
                      <p className="text-sm font-medium text-secondary">{notif.title}</p>
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm font-medium text-muted">No new notifications.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* 7. Customer Reviews Preview */}
      <GlassCard className="p-6 border-black/[0.04]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
            <Star size={18} className="text-yellow-500 fill-yellow-500" /> Recent Reviews
          </h3>
          <button onClick={() => handleTabChange('reviews')} className="text-xs font-bold text-primary hover:underline">View All</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {metrics.recentReviews?.length > 0 ? (
            metrics.recentReviews.map((review) => (
              <div key={review.id} className="p-5 rounded-2xl border border-black/[0.03] bg-surface/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex text-yellow-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} className={i < review.rating ? "fill-yellow-400" : "text-gray-300"} />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm font-medium text-secondary mb-3 line-clamp-2">"{review.comment}"</p>
                <div className="flex items-center gap-2 mt-auto">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                    {review.user?.firstName?.charAt(0) || 'C'}
                  </div>
                  <p className="text-xs font-bold text-muted">{review.user?.firstName} {review.user?.lastName}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-8">
              <p className="text-sm font-medium text-muted">No reviews yet.</p>
            </div>
          )}
        </div>
      </GlassCard>

    </div>
  );
}
