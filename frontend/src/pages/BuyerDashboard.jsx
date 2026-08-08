import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Plus, Calendar, ShoppingBag, Heart, MapPin, Trash, Check, Clock, User, X, PawPrint, Download } from 'lucide-react';
import axios from 'axios';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { getFullImageUrl } from '../utils/imageHelper.js';
import MinimalInput from '../components/ui/MinimalInput.jsx';
import ProfileTab from '../components/ui/ProfileTab.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/formatCurrency.js';

import { fetchWishlist, toggleWishlistItem } from '../redux/wishlistSlice.js';
import { fetchOrders, cancelOrder } from '../redux/orderSlice.js';
import { fetchAddresses, addAddress, deleteAddress, setDefaultAddress } from '../redux/addressSlice.js';
import { fetchPets, addPet, deletePet } from '../redux/petSlice.js';
import { addToCartAPI } from '../redux/cartSlice.js';

export default function BuyerDashboard() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { accessToken, user } = useSelector((state) => state.auth);
  
  const [activeTab, setActiveTab] = useState('pets');
  const [appointmentSubTab, setAppointmentSubTab] = useState('services');
  const [expandedItemIds, setExpandedItemIds] = useState({});

  const toggleTrackItem = (itemId) => {
    setExpandedItemIds(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const getBuyerStatusText = (item) => {
    if (item.status === 'CANCELLED') return 'Cancelled';
    if (item.status === 'PENDING') return 'Order Confirmed';
    if (item.status === 'PROCESSING') return 'Preparing your order';
    if (item.status === 'PACKED') return 'Packed';
    if (item.status === 'SHIPPED') {
      if (!item.estimatedDelivery) return 'Shipped';
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const estDate = new Date(item.estimatedDelivery);
      const estDateMidnight = new Date(estDate);
      estDateMidnight.setHours(0, 0, 0, 0);
      const diffTime = estDateMidnight.getTime() - now.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 2) return `Delivery in ${diffDays} Days`;
      if (diffDays === 2) return 'Delivery in 2 Days';
      if (diffDays === 1) return 'Delivery Tomorrow';
      if (diffDays === 0) return 'Arriving Today';
      return 'Out for Delivery';
    }
    if (item.status === 'DELIVERED') return 'Delivered';
    return item.status;
  };

  const getBuyerOrderStatusText = (order) => {
    if (order.status === 'CANCELLED') return 'Cancelled';
    if (!order.orderItems || order.orderItems.length === 0) return 'Pending';
    
    const activeItem = order.orderItems.find(item => item.status !== 'DELIVERED' && item.status !== 'CANCELLED');
    if (activeItem) {
      return getBuyerStatusText(activeItem);
    }
    
    const allDelivered = order.orderItems.every(item => item.status === 'DELIVERED');
    if (allDelivered) return 'Delivered';
    
    return 'Pending';
  };

  const renderTrackingTimeline = (item, order) => {
    let transitLabel = 'Out for Delivery';
    if (item.status === 'SHIPPED' && item.estimatedDelivery) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const estDate = new Date(item.estimatedDelivery);
      const estDateMidnight = new Date(estDate);
      estDateMidnight.setHours(0, 0, 0, 0);
      const diffTime = estDateMidnight.getTime() - now.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 2) {
        transitLabel = `Delivery in ${diffDays} Days`;
      } else if (diffDays === 2) {
        transitLabel = 'Delivery in 2 Days';
      } else if (diffDays === 1) {
        transitLabel = 'Delivery Tomorrow';
      } else if (diffDays === 0) {
        transitLabel = 'Arriving Today';
      } else {
        transitLabel = 'Out for Delivery';
      }
    }

    const stages = [
      { label: 'Order Confirmed', time: order.createdAt, completed: true },
      { label: 'Preparing your order', time: item.acceptedAt, completed: ['PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(item.status) },
      { label: 'Packed', time: item.packedAt, completed: ['PACKED', 'SHIPPED', 'DELIVERED'].includes(item.status) },
      { label: 'Shipped', time: item.shippedAt, completed: ['SHIPPED', 'DELIVERED'].includes(item.status) },
      { label: transitLabel, time: item.status === 'SHIPPED' ? item.shippedAt : null, completed: ['SHIPPED', 'DELIVERED'].includes(item.status) },
      { label: 'Delivered', time: item.deliveredAt, completed: item.status === 'DELIVERED' }
    ];

    const formatTime = (timeStr) => {
      if (!timeStr) return '';
      const d = new Date(timeStr);
      return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
      <div className="mt-4 p-5 bg-black/[0.02] border border-black/[0.05] rounded-2xl flex flex-col gap-5">
        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted">
          <span>Status: <span className="text-secondary">{getBuyerStatusText(item)}</span></span>
          {item.estimatedDelivery && (
            <span>Est. Delivery: <span className="text-primary">{new Date(item.estimatedDelivery).toLocaleDateString()}</span></span>
          )}
        </div>
        <div className="relative pl-6 flex flex-col gap-6">
          {stages.map((stage, idx) => {
            const isCompleted = stage.completed;
            const hasNext = idx < stages.length - 1;
            const nextCompleted = hasNext && stages[idx + 1].completed;

            return (
              <div key={idx} className="relative flex flex-col items-start gap-1">
                {/* Connector Line */}
                {hasNext && (
                  <div className={`absolute left-[-17px] top-[14px] w-[2px] h-[calc(100%+24px)] ${nextCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
                
                {/* Dot */}
                <div className={`absolute left-[-23px] top-[2px] w-[14px] h-[14px] rounded-full border-2 flex items-center justify-center ${
                  isCompleted ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'
                }`}>
                  {isCompleted && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>

                <span className={`text-xs font-bold tracking-wide transition-colors ${isCompleted ? 'text-secondary font-extrabold' : 'text-muted font-medium'}`}>
                  {stage.label}
                </span>
                
                {isCompleted && stage.time && (
                  <span className="text-[10px] text-muted font-bold">
                    {formatTime(stage.time)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab')) {
      setActiveTab(params.get('tab'));
    }
  }, [location]);
  
  const { items: wishlistItems } = useSelector(state => state.wishlist);
  const { items: orderHistory } = useSelector(state => state.orders);
  const { items: addressList } = useSelector(state => state.addresses);
  const { items: pets } = useSelector(state => state.pets);
  
  const [showAddPet, setShowAddPet] = useState(false);
  const [petForm, setPetForm] = useState({ name: '', breed: '', birthday: '', weight: '', vaccinations: '', medicalHistory: '', favoriteFood: '' });

  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({ street: '', city: '', state: '', postalCode: '', country: '' });

  useEffect(() => {
    dispatch(fetchWishlist());
    dispatch(fetchOrders());
    dispatch(fetchAddresses());
    dispatch(fetchPets());
  }, [dispatch]);

  const [appointments, setAppointments] = useState([]);
  const [adoptions, setAdoptions] = useState([]);
  const [loadingAdoptions, setLoadingAdoptions] = useState(false);

  // Escrow Dispute States
  const [disputeBookingId, setDisputeBookingId] = useState(null);
  const [disputeReasonText, setDisputeReasonText] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  const fetchAdoptions = async () => {
    try {
      setLoadingAdoptions(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/adoptions/my-requests`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setAdoptions(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdoptions(false);
    }
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/appointments`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        const formattedDb = (response.data?.data || []).map((app) => ({
          id: app.id,
          petName: app.dogName || app.pet?.name || 'Dog',
          dogName: app.dogName || app.pet?.name || 'Dog',
          dogBreed: app.dogBreed || app.pet?.breed || 'Unknown',
          dogAgeCategory: app.dogAgeCategory || 'Adult',
          dogGender: app.dogGender || 'Male',
          serviceName: app.service?.name || 'Clinical Vaccination',
          provider: app.provider ? `${app.provider.firstName} ${app.provider.lastName}` : 'Dr. Evelyn Carter',
          date: new Date(app.date).toISOString().split('T')[0], time: `${app.startTime} - ${app.endTime}`, status: app.status,
          bookingStatus: app.bookingStatus,
          paymentStatus: app.paymentStatus,
          confirmationDeadline: app.confirmationDeadline,
          providerAmount: app.providerAmount,
          commissionAmount: app.commissionAmount,
          disputeReason: app.disputeReason,
          providerResponse: app.providerResponse,
          adminDecision: app.adminDecision
        }));
        setAppointments(formattedDb);
      } catch (err) {
        setAppointments([]);
      }
    };
    fetchAppointments();
    if (accessToken) {
      fetchAdoptions();
    }

    const intervalId = setInterval(() => {
      fetchAppointments();
      if (accessToken) {
        fetchAdoptions();
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [accessToken]);

  const handleAddPet = async (e) => {
    e.preventDefault();
    try {
      await dispatch(addPet(petForm)).unwrap();
      setPetForm({ name: '', breed: '', birthday: '', weight: '', vaccinations: '', medicalHistory: '', favoriteFood: '' });
      setShowAddPet(false);
    } catch (err) {
      alert(err);
    }
  };

  const handleAddAddressSubmit = (e) => {
    e.preventDefault();
    dispatch(addAddress(addressForm));
    setAddressForm({ street: '', city: '', state: '', postalCode: '', country: '' });
    setShowAddAddress(false);
  };

  const handleCancelAppointment = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/appointments/${id}`, { headers: { Authorization: `Bearer ${accessToken}` }, withCredentials: true });
      setAppointments(appointments.filter(a => a.id !== id));
    } catch (err) { alert('Failed to cancel appointment'); }
  };

  const handleConfirmCompletion = async (id) => {
    if (!window.confirm('Are you sure you want to confirm completion of this service? This will release the escrow payment to the provider.')) return;
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/appointments/${id}/confirm-completion`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success('Service completion confirmed and payment released.');
      // Refresh appointments
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/appointments`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      const formattedDb = (response.data?.data || []).map((app) => ({
        id: app.id, petName: app.pet?.name || 'Milo', serviceName: app.service?.name || 'Clinical Vaccination',
        provider: app.provider ? `${app.provider.firstName} ${app.provider.lastName}` : 'Dr. Evelyn Carter',
        date: new Date(app.date).toISOString().split('T')[0], time: `${app.startTime} - ${app.endTime}`, status: app.status,
        bookingStatus: app.bookingStatus,
        paymentStatus: app.paymentStatus,
        confirmationDeadline: app.confirmationDeadline,
        providerAmount: app.providerAmount,
        commissionAmount: app.commissionAmount,
        disputeReason: app.disputeReason,
        providerResponse: app.providerResponse,
        adminDecision: app.adminDecision
      }));
      setAppointments(formattedDb);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm completion');
    }
  };

  const handleDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!disputeReasonText.trim()) {
      toast.error('Please enter a reason for reporting this issue');
      return;
    }
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/appointments/${disputeBookingId}/report-issue`, {
        disputeReason: disputeReasonText
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success('Dispute reported successfully. Payout has been put on hold.');
      setShowDisputeModal(false);
      setDisputeReasonText('');
      setDisputeBookingId(null);
      // Refresh appointments
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/appointments`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      const formattedDb = (response.data?.data || []).map((app) => ({
        id: app.id, petName: app.pet?.name || 'Milo', serviceName: app.service?.name || 'Clinical Vaccination',
        provider: app.provider ? `${app.provider.firstName} ${app.provider.lastName}` : 'Dr. Evelyn Carter',
        date: new Date(app.date).toISOString().split('T')[0], time: `${app.startTime} - ${app.endTime}`, status: app.status,
        bookingStatus: app.bookingStatus,
        paymentStatus: app.paymentStatus,
        confirmationDeadline: app.confirmationDeadline,
        providerAmount: app.providerAmount,
        commissionAmount: app.commissionAmount,
        disputeReason: app.disputeReason,
        providerResponse: app.providerResponse,
        adminDecision: app.adminDecision
      }));
      setAppointments(formattedDb);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report dispute');
    }
  };

  const handleCancelAdoptionRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this adoption request?')) return;
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/adoptions/requests/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success('Adoption request cancelled successfully');
      fetchAdoptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel adoption request');
    }
  };

  const handleConfirmOrderDelivery = async (orderItemId) => {
    if (!window.confirm('Are you sure you received this package? Confirming will release the funds from escrow to the seller.')) return;
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/orders/items/${orderItemId}/confirm-delivery`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success('Delivery confirmed successfully! Earnings released to seller.');
      const { fetchOrders } = await import('../redux/orderSlice.js');
      dispatch(fetchOrders());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm delivery');
    }
  };

  const handleDisputeOrderDelivery = async (orderItemId, disputeReason) => {
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/orders/items/${orderItemId}/dispute-delivery`, { disputeReason }, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success('Dispute reported successfully. Payment is put on hold.');
      const { fetchOrders } = await import('../redux/orderSlice.js');
      dispatch(fetchOrders());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report dispute');
    }
  };

  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);

  const handleDownloadInvoice = async (orderId) => {
    try {
      setDownloadingInvoiceId(orderId);
      const token = localStorage.getItem('pawmart_accessToken') || accessToken;
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/orders/${orderId}/invoice`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const invoiceNum = `INV-2026-${orderId.slice(-6).toUpperCase()}`;
      link.setAttribute('download', `PawMart-Invoice-${invoiceNum}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Download complete.');
    } catch (error) {
      console.error('Invoice download failed:', error);
      toast.error('Unable to download invoice. Please try again.');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };


  return (
    <div className="bg-background min-h-screen pt-28 pb-32">
      <div className="max-w-7xl mx-auto px-6 md:px-8 flex flex-col md:flex-row gap-12">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-4 md:gap-8 md:sticky md:top-32 h-fit">
          <div>
            <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-1">Dashboard</h2>
            <p className="text-xs font-medium text-muted">Buyer Account</p>
          </div>
          
          <nav className="flex flex-row overflow-x-auto md:flex-col gap-2 scrollbar-none border-t border-black/[0.07] pt-4 md:pt-6 pb-2 md:pb-0">
            {[
              { id: 'profile', icon: User, label: 'My Profile' },
              { id: 'pets', icon: Heart, label: 'My Pets' },
              { id: 'appointments', icon: Calendar, label: 'Appointments' },
              { id: 'orders', icon: ShoppingBag, label: 'Order History' },
              { id: 'wishlist', icon: Heart, label: 'Wishlist' },
              { id: 'addresses', icon: MapPin, label: 'Addresses' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  navigate(`/dashboard/buyer?tab=${tab.id}`, { replace: true });
                }}
                className={`flex items-center gap-2 sm:gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-[12px] text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 md:shrink transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-md' : 'text-muted hover:bg-black/5 hover:text-primary bg-surface md:bg-transparent'}`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow min-w-0">

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <ProfileTab />
          )}
          
          {/* Pets Tab */}
          {activeTab === 'pets' && (
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-extrabold font-outfit text-secondary">My Pets</h3>
                <PremiumButton onClick={() => setShowAddPet(!showAddPet)} variant={showAddPet ? 'ghost' : 'secondary'} className="!py-2 !px-4 text-sm">
                  {showAddPet ? 'Cancel' : <><Plus size={16} /> Add Pet</>}
                </PremiumButton>
              </div>

              <AnimatePresence>
                {showAddPet && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <form onSubmit={handleAddPet} className="bg-surface border border-black/[0.07] rounded-[20px] p-8 flex flex-col gap-6 shadow-sm mb-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <MinimalInput required label="Pet Name" value={petForm.name} onChange={(e) => setPetForm({...petForm, name: e.target.value})} />
                        <MinimalInput required label="Breed" value={petForm.breed} onChange={(e) => setPetForm({...petForm, breed: e.target.value})} />
                        <MinimalInput required type="date" label="Birthday" value={petForm.birthday} onChange={(e) => setPetForm({...petForm, birthday: e.target.value})} />
                        <MinimalInput required type="number" step="0.1" label="Weight (kg)" value={petForm.weight} onChange={(e) => setPetForm({...petForm, weight: e.target.value})} />
                        <MinimalInput label="Vaccinations" value={petForm.vaccinations} onChange={(e) => setPetForm({...petForm, vaccinations: e.target.value})} className="col-span-1 md:col-span-2" />
                        <MinimalInput label="Medical History" value={petForm.medicalHistory} onChange={(e) => setPetForm({...petForm, medicalHistory: e.target.value})} className="col-span-1 md:col-span-2" />
                      </div>
                      <PremiumButton type="submit" variant="primary" className="self-end !px-8">Save Profile</PremiumButton>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {pets.length === 0 && !showAddPet ? (
                <div className="bg-surface border border-black/[0.07] rounded-[20px] p-12 text-center text-muted font-medium shadow-sm flex flex-col items-center">
                  <Heart size={48} className="text-black/10 mb-4" />
                  <p>No pets added yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pets?.map(pet => (
                    <div key={pet.id} className="bg-white border border-black/[0.07] rounded-[20px] p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
                      <div className="w-14 h-14 bg-primary text-white rounded-[16px] flex items-center justify-center font-outfit text-2xl font-bold">
                        {pet.name.charAt(0)}
                      </div>
                      <h4 className="text-xl font-extrabold font-outfit text-secondary">{pet.name}</h4>
                      <p className="text-sm font-bold text-muted -mt-3">{pet.breed}</p>
                      <div className="grid grid-cols-2 gap-4 border-t border-black/[0.07] pt-4">
                        <div className="text-sm">
                          <p className="text-muted text-xs mb-1">Birthday</p>
                          <p className="font-medium text-secondary">{pet.birthday}</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-muted text-xs mb-1">Weight</p>
                          <p className="font-medium text-secondary">{pet.weight} kg</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-muted text-xs mb-1">Vaccinations</p>
                          <p className="font-medium text-secondary">{pet.vaccinations?.length ? pet.vaccinations : 'None'}</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-muted text-xs mb-1">Medical History</p>
                          <p className="font-medium text-secondary">{pet.medicalHistory?.length ? pet.medicalHistory : 'None'}</p>
                        </div>
                        {pet.favoriteFood && (
                          <div className="text-sm col-span-2">
                            <p className="text-muted text-xs mb-1">Favorite Food</p>
                            <p className="font-medium text-secondary">{pet.favoriteFood}</p>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => {
                          if(window.confirm('Delete this pet?')) {
                            dispatch(deletePet(pet.id));
                          }
                        }}
                        className="absolute top-4 right-4 p-2 bg-error/10 text-error rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="flex flex-col gap-8">
              <div>
                <h3 className="text-2xl font-extrabold font-outfit text-secondary">Appointments</h3>
                <p className="text-xs font-semibold text-muted">Manage your veterinary clinic appointments and pet adoption meetings.</p>
              </div>

              {/* Sub-tabs Toggle */}
              <div className="flex gap-6 border-b border-black/5 pb-2">
                <button
                  onClick={() => setAppointmentSubTab('services')}
                  className={`pb-2 text-sm font-bold transition-all relative ${appointmentSubTab === 'services' ? 'text-primary border-b-2 border-primary animate-none' : 'text-muted hover:text-secondary'}`}
                >
                  Clinic Bookings
                </button>
                <button
                  onClick={() => setAppointmentSubTab('adoptions')}
                  className={`pb-2 text-sm font-bold transition-all relative ${appointmentSubTab === 'adoptions' ? 'text-primary border-b-2 border-primary animate-none' : 'text-muted hover:text-secondary'}`}
                >
                  Pet Adoption Meetings ({adoptions.length})
                </button>
              </div>

              {appointmentSubTab === 'services' ? (
                appointments.filter(app => !app.adoptionRequestId).length === 0 ? (
                  <div className="bg-surface border border-black/[0.07] rounded-[20px] p-12 text-center text-muted font-medium shadow-sm">
                    No upcoming clinic appointments.
                  </div>
                ) : (
                  <div className="bg-white border border-black/[0.07] rounded-[20px] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface border-b border-black/[0.07]">
                            <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Service & Pet</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Provider</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Date & Time</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.07]">
                          {appointments.filter(app => !app.adoptionRequestId).map(app => {
                            const getHoursRemaining = (deadlineStr) => {
                              if (!deadlineStr) return 0;
                              const diff = new Date(deadlineStr) - new Date();
                              return diff <= 0 ? 0 : Math.ceil(diff / (1000 * 60 * 60));
                            };
                            
                            const getStatusBadge = (app) => {
                              const status = app.bookingStatus || app.status;
                              switch (status) {
                                case 'AWAITING_CUSTOMER_CONFIRMATION':
                                  return <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-100 text-amber-800">Awaiting Confirmation</span>;
                                case 'DISPUTED':
                                  return <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-100 text-red-600">Disputed (Hold)</span>;
                                case 'REFUNDED':
                                  return <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-50 text-red-500">Refunded</span>;
                                case 'ADMIN_REVIEW':
                                  return <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-purple-100 text-purple-800">Admin Review</span>;
                                case 'BOOKED':
                                  return <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-100 text-blue-800">Booked</span>;
                                case 'ACCEPTED':
                                  return <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-100 text-indigo-800">Accepted</span>;
                                case 'CONFIRMED':
                                  return <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-success/10 text-success">Confirmed</span>;
                                case 'IN_PROGRESS':
                                  return <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-600">In Progress</span>;
                                case 'COMPLETED':
                                  return <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-success/15 text-success">Completed</span>;
                                case 'CANCELLED':
                                  return <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-50 text-red-500">Cancelled</span>;
                                case 'REJECTED':
                                  return <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-50 text-red-400">Rejected</span>;
                                default:
                                  return <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-surface text-muted">{status}</span>;
                              }
                            };

                            const bStatus = app.bookingStatus || app.status;

                            return (
                              <tr key={app.id} className="hover:bg-surface/50 transition-colors">
                                <td className="px-6 py-5">
                                  <p className="font-bold text-secondary text-sm">{app.serviceName}</p>
                                  <p className="text-xs font-medium text-muted mt-1">For: {app.petName}</p>
                                </td>
                                <td className="px-6 py-5 text-sm font-medium text-secondary">{app.provider}</td>
                                <td className="px-6 py-5">
                                  <p className="text-sm font-bold text-secondary tabular-nums">{app.date}</p>
                                  <p className="text-xs font-medium text-muted tabular-nums mt-1">{app.time}</p>
                                </td>
                                <td className="px-6 py-5">
                                  {getStatusBadge(app)}
                                </td>
                                 <td className="px-6 py-5 text-right">
                                   {bStatus === 'AWAITING_CUSTOMER_CONFIRMATION' && (
                                     <div className="flex flex-col gap-2 items-end max-w-xs text-right bg-amber-50/50 border border-amber-100 p-3 rounded-xl shadow-sm">
                                       <p className="text-xs font-semibold text-amber-900 leading-normal">
                                         Your provider has marked this service as completed. Please confirm within 72 hours.
                                       </p>
                                       <span className="text-xs font-extrabold text-amber-700 font-outfit uppercase tracking-wider">
                                         ⏳ {getHoursRemaining(app.confirmationDeadline)} Hours Remaining
                                       </span>
                                       <div className="flex gap-2 mt-1">
                                         <PremiumButton onClick={() => handleConfirmCompletion(app.id)} variant="primary" className="!py-1.5 !px-3 text-[10px] flex items-center gap-1">
                                           ✓ Confirm Service Completed
                                         </PremiumButton>
                                         <PremiumButton onClick={() => { setDisputeBookingId(app.id); setShowDisputeModal(true); }} variant="ghost" className="!py-1.5 !px-3 text-[10px] flex items-center gap-1 !text-red-600 border !border-red-500/20 hover:!bg-red-50">
                                           ⚠ Report an Issue
                                         </PremiumButton>
                                       </div>
                                     </div>
                                   )}
                                  {bStatus === 'DISPUTED' && (
                                    <div className="text-right">
                                      <p className="text-xs font-bold text-red-500">Frozen in Escrow</p>
                                      <p className="text-[10px] text-muted italic max-w-[200px] truncate mt-0.5" title={app.disputeReason}>Reason: "{app.disputeReason}"</p>
                                    </div>
                                  )}
                                  {bStatus === 'ADMIN_REVIEW' && (
                                    <div className="text-right">
                                      <p className="text-xs font-bold text-purple-600">Admin Reviewing</p>
                                      <p className="text-[10px] text-muted italic max-w-[200px] truncate mt-0.5" title={app.providerResponse}>Explanation: "{app.providerResponse}"</p>
                                    </div>
                                  )}
                                  {bStatus === 'CANCELLED' && (
                                     <div className="flex flex-col items-end gap-1 max-w-xs text-right bg-red-50 border border-red-100 p-3 rounded-xl">
                                       <p className="text-xs font-bold text-red-600">Appointment Cancelled by Clinic</p>
                                       <p className="text-[10px] text-muted leading-normal">Your appointment has been cancelled by the clinic. Please book another available session.</p>
                                       {app.paymentStatus === 'REFUNDED' && (
                                         <span className="text-[10px] font-bold text-success mt-0.5">✓ Your payment has been fully refunded.</span>
                                       )}
                                     </div>
                                   )}
                                  {bStatus === 'PENDING' && (
                                    <button onClick={() => handleCancelAppointment(app.id)} className="text-xs font-bold text-error hover:underline">Cancel</button>
                                  )}
                                  {!['PENDING', 'AWAITING_CUSTOMER_CONFIRMATION', 'DISPUTED', 'ADMIN_REVIEW', 'CANCELLED'].includes(bStatus) && (
                                    <span className="text-xs text-muted font-medium">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              ) : (
                loadingAdoptions ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : adoptions.length === 0 ? (
                  <div className="bg-surface border border-black/[0.07] rounded-[20px] p-12 text-center text-muted font-medium shadow-sm flex flex-col items-center">
                    <span className="text-4xl mb-4">❤️</span>
                    <h4 className="text-lg font-bold text-secondary mb-1">No Adoption Meetings Yet</h4>
                    <p className="text-sm max-w-sm mb-6">You haven't scheduled any adoption meetings yet. Browse our lovely pets and schedule a meet!</p>
                    <Link to="/adoption">
                      <PremiumButton variant="primary">Browse Pets for Adoption</PremiumButton>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {adoptions.map((req) => {
                      const pet = req.pet;
                      const providerName = req.pet?.seller?.providerProfile?.businessName || req.pet?.seller?.providerProfile?.clinicName || 'Adoption Center';
                      const clinicAddress = req.pet?.seller?.providerProfile?.businessAddress || 'Adoption Clinic';
                      const phone = req.pet?.seller?.providerProfile?.contactNumber || req.pet?.seller?.phone || 'N/A';
                      const statusText = req.status;

                      const getStatusBadgeColor = (status) => {
                        switch (status) {
                          case 'PENDING': return 'bg-yellow-50 text-yellow-600';
                          case 'MEETING_SCHEDULED': return 'bg-blue-50 text-blue-600';
                          case 'MEETING_COMPLETED': return 'bg-indigo-50 text-indigo-600';
                          case 'APPROVED': return 'bg-green-50 text-green-600';
                          case 'REJECTED': return 'bg-red-50 text-red-600';
                          case 'VISIT_CENTER': return 'bg-orange-50 text-orange-600';
                          case 'COMPLETED': return 'bg-green-100 text-green-700 font-extrabold';
                          case 'CANCELLED': return 'bg-gray-100 text-gray-600';
                          default: return 'bg-gray-100 text-gray-600';
                        }
                      };

                      // Helper to determine active step in adoption timeline
                      const stages = [
                        { key: 'PENDING', label: 'Submitted' },
                        { key: 'MEETING_SCHEDULED', label: 'Meeting Scheduled' },
                        { key: 'MEETING_COMPLETED', label: 'Meeting Completed' },
                        { key: 'APPROVED', label: 'Adoption Approved' },
                        { key: 'COMPLETED', label: 'Adoption Completed' }
                      ];

                      const getActiveStageIndex = (currStatus) => {
                        if (currStatus === 'REJECTED' || currStatus === 'CANCELLED') return -1;
                        if (currStatus === 'VISIT_CENTER') return 3;
                        return stages.findIndex(s => s.key === currStatus);
                      };

                      const currentStageIndex = getActiveStageIndex(statusText);

                      return (
                        <div key={req.id} className="bg-white border border-black/[0.07] rounded-[24px] p-6 md:p-8 shadow-sm flex flex-col gap-6 hover:shadow-md transition-shadow">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-black/5">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden border border-black/5 shrink-0">
                                {pet?.images && pet.images.length > 0 ? (
                                  <img src={getFullImageUrl(pet.images[0].url)} alt={pet.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">🐾</div>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-extrabold font-outfit text-lg text-secondary">{pet?.name || 'Milo'}</h4>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeColor(statusText)}`}>
                                    {statusText === 'PENDING' ? 'Submitted' : statusText.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-primary uppercase mt-0.5">{pet?.breed || 'Unknown Breed'}</p>
                                <p className="text-[10px] font-bold text-muted mt-1 uppercase">Request Date: {new Date(req.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <Link to={`/product/${pet?.id}`}>
                                <PremiumButton variant="secondary" className="!py-2 !px-4 text-xs font-bold">
                                  View Clinic
                                </PremiumButton>
                              </Link>
                              <Link to={`/adoptions/tracking/${req.id}`}>
                                <PremiumButton variant="secondary" className="!py-2 !px-4 text-xs font-bold">
                                  View Details
                                </PremiumButton>
                              </Link>
                              {statusText === 'PENDING' && (
                                <PremiumButton 
                                  onClick={() => handleCancelAdoptionRequest(req.id)} 
                                  variant="ghost" 
                                  className="!py-2 !px-4 text-xs font-bold !text-error hover:!bg-error/5"
                                >
                                  Cancel Request
                                </PremiumButton>
                              )}
                            </div>
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm font-semibold">
                            <div className="bg-surface p-4 rounded-2xl border border-black/[0.03]">
                              <span className="block text-[10px] text-muted uppercase font-extrabold tracking-wider mb-1">Adoption Center</span>
                              <span className="text-secondary block font-bold">{providerName}</span>
                              <span className="text-muted block text-xs font-medium mt-0.5 leading-relaxed">{clinicAddress}</span>
                              <span className="text-muted block text-xs font-medium mt-1">Ph: {phone}</span>
                            </div>
                            
                            <div className="bg-surface p-4 rounded-2xl border border-black/[0.03]">
                              <span className="block text-[10px] text-muted uppercase font-extrabold tracking-wider mb-1">Meeting Time</span>
                              <span className="text-secondary block font-bold">
                                {new Date(req.preferredDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <span className="text-primary block text-xs font-bold mt-1">Time: {req.preferredTime}</span>
                            </div>

                            <div className="bg-surface p-4 rounded-2xl border border-black/[0.03]">
                              <span className="block text-[10px] text-muted uppercase font-extrabold tracking-wider mb-1">Provider Notes</span>
                              <p className="text-secondary text-xs font-medium mt-1 leading-relaxed italic">
                                {req.rescheduleReason ? `Rescheduled: "${req.rescheduleReason}"` : req.notes ? `"${req.notes}"` : 'No notes from provider yet.'}
                              </p>
                            </div>
                          </div>

                          {/* Timeline Progress */}
                          {statusText === 'REJECTED' ? (
                            <div className="bg-red-50 border border-red-200 rounded-[20px] p-4 text-center">
                              <span className="text-xs font-bold text-red-600">This adoption request was rejected by the provider.</span>
                            </div>
                          ) : statusText === 'CANCELLED' ? (
                            <div className="bg-gray-50 border border-gray-200 rounded-[20px] p-4 text-center">
                              <span className="text-xs font-bold text-gray-500">This adoption request has been cancelled.</span>
                            </div>
                          ) : (
                            <div className="pt-4">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 relative">
                                {stages.map((stage, idx) => {
                                  const isCompleted = idx <= currentStageIndex;
                                  const isCurrent = idx === currentStageIndex;
                                  const hasNext = idx < stages.length - 1;

                                  return (
                                    <div key={stage.key} className="flex-grow flex flex-col items-center text-center relative px-2">
                                      {/* Circle connector line */}
                                      {hasNext && (
                                        <div className={`hidden md:block absolute left-[50%] top-2.5 w-full h-[2px] z-0 ${
                                          idx < currentStageIndex ? 'bg-green-500' : 'bg-black/10'
                                        }`} />
                                      )}

                                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 transition-all ${
                                        isCurrent ? 'bg-primary border-primary ring-4 ring-primary/20 scale-110' :
                                        isCompleted ? 'bg-green-500 border-green-500' : 'bg-white border-black/15'
                                      }`}>
                                        {isCompleted && (
                                          <Check size={10} className="text-white" />
                                        )}
                                      </div>

                                      <span className={`text-[11px] font-bold mt-2 tracking-wide ${
                                        isCurrent ? 'text-primary font-extrabold' :
                                        isCompleted ? 'text-secondary' : 'text-muted'
                                      }`}>
                                        {stage.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="flex flex-col gap-8">
              <h3 className="text-2xl font-extrabold font-outfit text-secondary">Order History</h3>
              {orderHistory.length === 0 ? (
                <div className="bg-surface border border-black/[0.07] rounded-[20px] p-12 text-center text-muted font-medium shadow-sm flex flex-col items-center">
                   <ShoppingBag size={48} className="text-black/10 mb-4" />
                   <p>You haven't placed any orders yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {orderHistory?.map(order => (
                    <div key={order.id} className="bg-white border border-black/[0.07] rounded-[20px] p-6 shadow-sm flex flex-col gap-4">
                      <div className="flex justify-between items-center border-b border-black/[0.07] pb-4">
                        <div>
                          <p className="text-sm font-bold text-secondary">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-xs font-medium text-muted">
                            {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                            getBuyerOrderStatusText(order) === 'Delivered' ? 'bg-success/10 text-success' : 
                            getBuyerOrderStatusText(order) === 'Cancelled' ? 'bg-error/10 text-error' : 'bg-accent/20 text-primary'
                          }`}>
                            {getBuyerOrderStatusText(order)}
                          </span>
                          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                            {order.payment?.status === 'COMPLETED' ? 'PAID' : 'UNPAID'}
                          </span>
                        </div>
                      </div>
                      
                      {order.address && (
                        <div className="text-xs font-medium text-muted border-b border-black/[0.07] pb-4">
                          <span className="font-bold text-secondary">Delivery: </span> 
                          {order.address.street}, {order.address.city}, {order.address.state} {order.address.postalCode}
                        </div>
                      )}

                      <div className="flex flex-col gap-4">
                        {order.orderItems?.map(item => (
                          <div key={item.id} className="border-b border-black/[0.04] pb-4 last:border-none last:pb-0">
                            <div className="flex justify-between items-center text-sm font-medium">
                              <span className="text-secondary">{item.quantity}x {item.product?.name}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-muted">{formatCurrency(item.price * item.quantity)}</span>
                                <button 
                                  onClick={() => toggleTrackItem(item.id)}
                                  className="text-xs font-bold text-primary hover:underline"
                                >
                                  {expandedItemIds[item.id] ? 'Hide Tracking' : 'Track Package'}
                                </button>
                              </div>
                            </div>
                            {expandedItemIds[item.id] && renderTrackingTimeline(item, order)}
                            {item.status === 'DELIVERED' && !item.buyerDeliveryConfirmed && !item.deliveryDisputed && (
                              <div className="mt-3 p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-2 max-w-lg">
                                <p className="text-xs font-bold text-secondary">Has your order been delivered?</p>
                                <p className="text-[11px] text-muted leading-relaxed">
                                  The seller has marked this item as delivered. If you do not confirm delivery or dispute it within 72 hours, it will be automatically confirmed.
                                </p>
                                <div className="flex gap-2">
                                  <PremiumButton 
                                    onClick={() => handleConfirmOrderDelivery(item.id)} 
                                    className="!py-1.5 !px-3 text-[10px] flex items-center gap-1"
                                  >
                                    ✓ Yes, I Received It
                                  </PremiumButton>
                                  <PremiumButton 
                                    onClick={() => {
                                      const reason = window.prompt("Please state the issue / dispute reason:");
                                      if (reason) handleDisputeOrderDelivery(item.id, reason);
                                    }} 
                                    variant="ghost" 
                                    className="!py-1.5 !px-3 text-[10px] flex items-center gap-1 !text-red-600 border border-red-500/20 hover:!bg-red-50"
                                  >
                                    ⚠ I Haven't Received It / Report Issue
                                  </PremiumButton>
                                </div>
                              </div>
                            )}
                            {item.buyerDeliveryConfirmed && (
                              <p className="text-[11px] text-success font-bold mt-2 flex items-center gap-1">✓ Delivery Confirmed</p>
                            )}
                            {item.deliveryDisputed && (
                              <div className="mt-2 p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-lg">
                                ⚠️ Delivery Disputed: "{item.deliveryDisputeReason || 'Item not received'}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-black/[0.07]">
                        <div className="flex items-center gap-3">
                          {['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status) && 
                           !order.orderItems?.some(item => ['SHIPPED', 'DELIVERED'].includes(item.status)) && (
                            <button 
                              onClick={() => {
                                if (window.confirm('Are you sure you want to cancel this order?')) {
                                  dispatch(cancelOrder(order.id)).unwrap().then(() => alert('Order Cancelled Successfully')).catch(e => alert(e));
                                }
                              }}
                              className="text-xs font-bold text-error hover:underline"
                            >
                              Cancel Order
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-secondary text-sm">Total</span>
                            <span className="font-outfit font-extrabold text-primary">{formatCurrency(order.total)}</span>
                          </div>
                          <button
                            onClick={() => handleDownloadInvoice(order.id)}
                            disabled={downloadingInvoiceId === order.id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all disabled:opacity-50 shrink-0"
                          >
                            <Download size={14} />
                            {downloadingInvoiceId === order.id ? 'Downloading...' : 'Download Invoice'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Wishlist Tab */}
          {activeTab === 'wishlist' && (
            <div className="flex flex-col gap-8">
              <h3 className="text-2xl font-extrabold font-outfit text-secondary">Wishlist</h3>
              {wishlistItems.length === 0 ? (
                <div className="bg-surface border border-black/[0.07] rounded-[20px] p-12 text-center text-muted font-medium shadow-sm">
                  Your wishlist is empty.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlistItems?.map(item => {
                    const isPet = item.itemType === 'PET';
                    const data = isPet ? item.pet : item.product;
                    
                    if (!data) return null;
                    
                    const rawUrl = data.image || data.imageUrl || (data.images?.[0]?.url);
                    const imageUrl = getFullImageUrl(rawUrl);

                    return (
                      <div key={item.id} className="bg-white border border-black/[0.07] rounded-[20px] p-4 shadow-sm flex flex-col group">
                        <div className="relative aspect-square rounded-[16px] overflow-hidden mb-4 bg-surface">
                          <img src={imageUrl} alt={data.name} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                          <button onClick={() => dispatch(toggleWishlistItem(data))} className="absolute top-3 right-3 p-2 bg-white/90 rounded-full text-error shadow-sm hover:scale-110 transition-transform">
                             <Trash size={14} />
                          </button>
                        </div>
                        <div className="flex flex-col flex-grow px-1">
                          <div className="flex justify-between items-start gap-4 mb-2">
                            <h4 className="font-bold text-sm text-secondary line-clamp-2">{data.name}</h4>
                            {!isPet && <span className="font-outfit font-extrabold text-secondary">{formatCurrency(data.price)}</span>}
                          </div>
                          
                          {isPet && (
                            <div className="text-xs text-muted mb-4 font-medium flex flex-col gap-1">
                              <span>Breed: {data.breed || 'Mixed'}</span>
                              {data.age && <span>Age: {data.age}</span>}
                              {data.location && <span>Loc: {data.location}</span>}
                            </div>
                          )}

                          {isPet ? (
                            <PremiumButton onClick={() => navigate('/appointments/book', { state: { pet: data } })} variant="secondary" className="w-full mt-auto !py-2.5 text-xs">Schedule Meeting</PremiumButton>
                          ) : (
                            <PremiumButton 
                              onClick={() => {
                                dispatch(addToCartAPI({ product: data, quantity: 1 }));
                                dispatch(toggleWishlistItem(data));
                              }} 
                              variant="secondary" 
                              className="w-full mt-auto !py-2.5 text-xs"
                            >
                              Move to Cart
                            </PremiumButton>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}



          {/* Addresses Tab */}
          {activeTab === 'addresses' && (
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-extrabold font-outfit text-secondary">Addresses</h3>
                <PremiumButton onClick={() => setShowAddAddress(!showAddAddress)} variant={showAddAddress ? 'ghost' : 'secondary'} className="!py-2 !px-4 text-sm">
                  {showAddAddress ? 'Cancel' : <><Plus size={16} /> Add Address</>}
                </PremiumButton>
              </div>

              <AnimatePresence>
                {showAddAddress && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <form onSubmit={handleAddAddressSubmit} className="bg-surface border border-black/[0.07] rounded-[20px] p-8 flex flex-col gap-6 shadow-sm mb-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <MinimalInput required label="Street Address" value={addressForm.street} onChange={(e) => setAddressForm({...addressForm, street: e.target.value})} className="col-span-1 md:col-span-2" />
                        <MinimalInput required label="City" value={addressForm.city} onChange={(e) => setAddressForm({...addressForm, city: e.target.value})} />
                        <MinimalInput required label="State/Region" value={addressForm.state} onChange={(e) => setAddressForm({...addressForm, state: e.target.value})} />
                        <MinimalInput required label="Postal Code" value={addressForm.postalCode} onChange={(e) => setAddressForm({...addressForm, postalCode: e.target.value})} />
                        <MinimalInput required label="Country" value={addressForm.country} onChange={(e) => setAddressForm({...addressForm, country: e.target.value})} className="col-span-1 md:col-span-2" />
                      </div>
                      <PremiumButton type="submit" variant="primary" className="self-end !px-8">Save Address</PremiumButton>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {addressList?.map(addr => (
                  <div key={addr.id} className="bg-white border border-black/[0.07] rounded-[20px] p-6 shadow-sm relative group flex flex-col">
                    {addr.isDefault && (
                      <span className="absolute top-6 right-6 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md">Default</span>
                    )}
                    <MapPin size={24} className="text-muted mb-4" />
                    <h4 className="font-bold text-base text-secondary mb-1">{addr.street}</h4>
                    <p className="text-sm font-medium text-muted mb-6">{addr.city}, {addr.state} {addr.postalCode} <br/> {addr.country}</p>
                    
                    <div className="mt-auto flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {!addr.isDefault && (
                        <button onClick={() => dispatch(setDefaultAddress(addr.id))} className="text-xs font-bold text-primary hover:underline transition-colors">
                          Set Default
                        </button>
                      )}
                      <button onClick={() => dispatch(deleteAddress(addr.id))} className="text-xs font-bold text-error hover:underline transition-colors ml-auto">
                        Remove Address
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] max-w-md w-full shadow-premium p-8 relative">
            <button
              onClick={() => {
                setShowDisputeModal(false);
                setDisputeBookingId(null);
                setDisputeReasonText('');
              }}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold font-outfit text-secondary mb-6">Report Service Issue</h3>
            <p className="text-sm text-gray-500 mb-6">
              Please describe the issue you encountered. Escrow payment will be put <strong>ON HOLD</strong> and the provider will be notified.
            </p>

            <form onSubmit={handleDisputeSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted uppercase tracking-wider">Reason for dispute</label>
                <textarea
                  required
                  rows="4"
                  placeholder="e.g. The clinic was closed during the booked slot / Provider did not perform the service."
                  value={disputeReasonText}
                  onChange={(e) => setDisputeReasonText(e.target.value)}
                  className="w-full p-4 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <PremiumButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowDisputeModal(false);
                    setDisputeBookingId(null);
                    setDisputeReasonText('');
                  }}
                >
                  Cancel
                </PremiumButton>
                <PremiumButton type="submit" className="!bg-red-500 hover:!bg-red-600 text-white border-none">
                  Submit Dispute
                </PremiumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
