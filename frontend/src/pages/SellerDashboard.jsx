import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Box, ShoppingBag, DollarSign, 
  Star, User, Bell, Settings, Phone, LogOut, Wallet
} from 'lucide-react';
import { clearCredentials } from '../redux/authSlice';

import DashboardOverview from '../components/seller/DashboardOverview.jsx';
import ProductManagement from '../components/seller/ProductManagement.jsx';
import InventoryManagement from '../components/seller/InventoryManagement.jsx';
import OrderManagement from '../components/seller/OrderManagement.jsx';
import RevenueAnalytics from '../components/seller/RevenueAnalytics.jsx';
import CustomerReviews from '../components/seller/CustomerReviews.jsx';
import SellerProfileManager from '../components/seller/SellerProfileManager.jsx';
import Notifications from '../components/seller/Notifications.jsx';
import SettingsTab from '../components/seller/SettingsTab.jsx';
import ContactSupport from '../components/seller/ContactSupport.jsx';
import ErrorBoundary from '../components/ui/ErrorBoundary.jsx';
import SellerWallet from '../components/seller/SellerWallet.jsx';

export default function SellerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { accessToken } = useSelector((state) => state.auth);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab')) {
      setActiveTab(params.get('tab'));
    }
  }, [location]);

  // Fetch unread notification count for badge
  const fetchUnreadCount = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/seller/notifications`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include'
      });
      const json = await res.json();
      const data = json.data || [];
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (_) {}
  };

  useEffect(() => {
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(timer);
  }, [accessToken]);

  // When user opens notifications tab, reset local badge
  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    navigate(`/seller/home?tab=${tabId}`, { replace: true });
    if (tabId === 'notifications') {
      setTimeout(() => setUnreadCount(0), 2000);
    }
  };

  const tabs = [
    { id: 'overview',       icon: LayoutDashboard, label: 'Home' },
    { id: 'products',       icon: Package,         label: 'Product Management' },
    { id: 'inventory',      icon: Box,             label: 'Inventory' },
    { id: 'orders',         icon: ShoppingBag,     label: 'Order Management' },
    { id: 'revenue',        icon: DollarSign,      label: 'Revenue & Analytics' },
    { id: 'wallet',         icon: Wallet,          label: 'Wallet & Payouts' },
    { id: 'reviews',        icon: Star,            label: 'Customer Reviews' },
    { id: 'profile',        icon: User,            label: 'Store Profile' },
    { id: 'notifications',  icon: Bell,            label: 'Notifications', badge: unreadCount },
    { id: 'settings',       icon: Settings,        label: 'Settings' },
    { id: 'support',        icon: Phone,           label: 'Contact Support' }
  ];

  return (
    <div className="bg-background min-h-screen pt-28 pb-32">
      <div className="max-w-7xl mx-auto px-6 md:px-8 flex flex-col md:flex-row gap-12">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-4 md:gap-8 md:sticky md:top-32 h-fit">
          <div>
            <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-1">Seller Hub</h2>
            <p className="text-xs font-medium text-muted">Manage your business</p>
          </div>
          
          <nav className="flex flex-row overflow-x-auto md:flex-col gap-2 border-t border-black/[0.07] pt-4 md:pt-6 pb-2 md:pb-0 scrollbar-none max-h-[70vh] pr-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-2 sm:gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-[12px] text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 md:shrink transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-md' : 'text-muted hover:bg-black/5 hover:text-primary bg-surface md:bg-transparent'}`}
              >
                <tab.icon size={16} />
                <span className="text-left">{tab.label}</span>
                {tab.badge > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold ${activeTab === tab.id ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            ))}
            
            {/* Divider */}
            <div className="hidden md:block h-px bg-black/[0.07] my-2" />
            
            <button
              onClick={() => {
                dispatch(clearCredentials());
                navigate('/');
              }}
              className="flex items-center gap-2 sm:gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-[12px] text-xs sm:text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-600 whitespace-nowrap shrink-0 md:shrink transition-all md:mt-auto bg-surface md:bg-transparent"
            >
              <LogOut size={16} />
              Logout
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow min-w-0">
          <ErrorBoundary>
            {activeTab === 'overview'       && <DashboardOverview />}
            {activeTab === 'products'       && <ProductManagement />}
            {activeTab === 'inventory'      && <InventoryManagement />}
            {activeTab === 'orders'         && <OrderManagement />}
            {activeTab === 'revenue'        && <RevenueAnalytics />}
            {activeTab === 'wallet'         && <SellerWallet />}
            {activeTab === 'reviews'        && <CustomerReviews />}
            {activeTab === 'profile'        && <SellerProfileManager />}
            {activeTab === 'notifications'  && <Notifications />}
            {activeTab === 'settings'       && <SettingsTab />}
            {activeTab === 'support'        && <ContactSupport />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
