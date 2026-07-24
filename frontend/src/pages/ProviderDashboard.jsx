import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, PawPrint, Scissors, Calendar, BookOpen, Users, 
  Star, DollarSign, BarChart3, Settings, LogOut, ShieldCheck, Heart, Wallet 
} from 'lucide-react';
import { clearCredentials } from '../redux/authSlice';

import DashboardOverview from '../components/provider/DashboardOverview.jsx';
import PetManagement from '../components/provider/PetManagement.jsx';
import ServiceManagement from '../components/provider/ServiceManagement.jsx';
import BookingManagement from '../components/provider/BookingManagement.jsx';
import ProviderCalendar from '../components/provider/ProviderCalendar.jsx';
import CustomerManagement from '../components/provider/CustomerManagement.jsx';
import ProviderReviews from '../components/provider/ProviderReviews.jsx';
import ProviderRevenue from '../components/provider/ProviderRevenue.jsx';
import ProviderSettings from '../components/provider/ProviderSettings.jsx';
import AdoptionRequests from '../components/provider/AdoptionRequests.jsx';
import ErrorBoundary from '../components/ui/ErrorBoundary.jsx';
import PremiumPayment from '../components/provider/PremiumPayment.jsx';
import ProviderWallet from '../components/provider/ProviderWallet.jsx';

export default function ProviderDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab')) {
      setActiveTab(params.get('tab'));
    }
  }, [location]);

  const tabs = [
    { id: 'overview', icon: LayoutDashboard, label: 'Home' },
    { id: 'pets', icon: PawPrint, label: 'Pet Listings' },
    { id: 'services', icon: Scissors, label: 'Service Management' },
    { id: 'appointments', icon: ShieldCheck, label: 'Appointments' },
    { id: 'bookings', icon: Calendar, label: 'Bookings' },
    { id: 'adoptions', icon: Heart, label: 'Adoption Requests' },
    { id: 'customers', icon: Users, label: 'Customers' },
    { id: 'reviews', icon: Star, label: 'Reviews' },
    { id: 'revenue', icon: DollarSign, label: 'Revenue' },
    { id: 'wallet', icon: Wallet, label: 'Wallet & Payouts' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="bg-background min-h-screen pt-28 pb-32">
      <div className="max-w-7xl mx-auto px-6 md:px-8 flex flex-col md:flex-row gap-12">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-4 md:gap-8 md:sticky md:top-32 h-fit">
          <div>
            <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-1">Provider Hub</h2>
            <p className="text-xs font-medium text-muted">Manage your clinic & listings</p>
          </div>
          
          <nav className="flex flex-row overflow-x-auto md:flex-col gap-2 border-t border-black/[0.07] pt-4 md:pt-6 pb-2 md:pb-0 scrollbar-none max-h-[70vh] pr-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  navigate(`/dashboard/provider?tab=${tab.id}`, { replace: true });
                }}
                className={`flex items-center gap-2 sm:gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-[12px] text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 md:shrink transition-all ${
                  activeTab === tab.id 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-muted hover:bg-black/5 hover:text-primary bg-surface md:bg-transparent'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
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
            {activeTab === 'overview' && <DashboardOverview />}
            {activeTab === 'pets' && <PetManagement />}
            {activeTab === 'services' && <ServiceManagement />}
            {activeTab === 'appointments' && <ProviderCalendar />}
            {activeTab === 'bookings' && <BookingManagement />}
            {activeTab === 'adoptions' && <AdoptionRequests />}
            {activeTab === 'customers' && <CustomerManagement />}
            {activeTab === 'reviews' && <ProviderReviews />}
            {activeTab === 'revenue' && <ProviderRevenue />}
            {activeTab === 'wallet' && <ProviderWallet />}
            {activeTab === 'settings' && <ProviderSettings />}
            {activeTab === 'premium-payment' && <PremiumPayment />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
