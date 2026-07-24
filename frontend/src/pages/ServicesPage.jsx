import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Stethoscope, Scissors, Sparkles, Star, X, CheckCircle2, Phone, Mail, Clock, Shield, MapPin, Award } from 'lucide-react';
import axios from 'axios';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { formatCurrency } from '../utils/formatCurrency.js';
import GlassCard from '../components/ui/GlassCard.jsx';
import MinimalInput from '../components/ui/MinimalInput.jsx';
import { getFullImageUrl } from '../utils/imageHelper.js';
import { loadRazorpaySDK } from '../utils/razorpayHelper.js';

import { fetchPets } from '../redux/petSlice.js';


export default function ServicesPage() {
  const dispatch = useDispatch();
  const { isAuthenticated, accessToken, user } = useSelector((state) => state.auth);
  const { items: userPets } = useSelector((state) => state.pets);
  const navigate = useNavigate();

  const [bookingService, setBookingService] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSlot, setBookingSlot] = useState('14:00 - 14:30');
  const [petId, setPetId] = useState('');

  // Dynamic slots state
  const [sessionSlots, setSessionSlots] = useState({
    morningRemaining: 5,
    morningCapacity: 5,
    afternoonRemaining: 5,
    afternoonCapacity: 5,
    morningBooked: 0,
    afternoonBooked: 0
  });

  // Dog booking details form states
  const [selectedSession, setSelectedSession] = useState('');
  const [dogName, setDogName] = useState('');
  const [dogAgeCategory, setDogAgeCategory] = useState('Puppy (0-1 Year)');
  const [dogBreed, setDogBreed] = useState('');
  const [dogWeight, setDogWeight] = useState('');
  const [dogGender, setDogGender] = useState('Male');
  const [dogAllergies, setDogAllergies] = useState('');
  const [dogConditions, setDogConditions] = useState('');
  const [dogVaccinated, setDogVaccinated] = useState('Fully Vaccinated');

  const [services, setServices] = useState([]);
  const [isServicesLoading, setIsServicesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [categories, setCategories] = useState(['ALL', 'VET', 'GROOMING', 'TRAINING', 'BOARDING', 'EMERGENCY_CARE']);

  const getCategoryLabel = (cat) => {
    const labels = {
      'ALL': 'All Services',
      'VET': 'Veterinary',
      'GROOMING': 'Grooming',
      'TRAINING': 'Training',
      'BOARDING': 'Boarding',
      'EMERGENCY_CARE': 'Emergency Care',
      'PET_TAXI': 'Pet Taxi',
      'PET_WALKING': 'Pet Walking',
      'PET_PHOTOGRAPHY': 'Pet Photography',
      'NUTRITION': 'Nutrition',
      'BEHAVIOR_CONSULTATION': 'Behavior Consultation'
    };
    if (labels[cat]) return labels[cat];
    return cat
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/search/services/categories`);
      const slugs = (res.data || []).map(c => c.slug.toUpperCase()).filter(slug => slug !== 'ALL');
      setCategories(['ALL', ...slugs]);
    } catch (err) {
      console.error('Failed to fetch service categories:', err);
    }
  };

  const fetchServices = async () => {
    try {
      setIsServicesLoading(true);
      const url = selectedCategory === 'ALL' 
        ? `${import.meta.env.VITE_API_URL}/search/services`
        : `${import.meta.env.VITE_API_URL}/search/services?category=${selectedCategory}`;
      const response = await axios.get(url);
      setServices(response.data || []);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setIsServicesLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchServices();
  }, [selectedCategory]);
  
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchPets());
    }
  }, [isAuthenticated, dispatch]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [bookingStep, setBookingStep] = useState('CLINIC_INFO'); // CLINIC_INFO, DETAILS

  const parse24Time = (timeStr) => {
    if (!timeStr) return { hour: 0, minute: 0 };
    const cleanStr = timeStr.trim().toUpperCase();
    const isPM = cleanStr.includes('PM');
    const isAM = cleanStr.includes('AM');
    const numbersOnly = cleanStr.replace(/[AP]M/, '').trim();
    const parts = numbersOnly.split(':');
    let hour = parseInt(parts[0], 10);
    let minute = parts[1] ? parseInt(parts[1], 10) : 0;
    if (isPM && hour < 12) hour += 12;
    if (isAM && hour === 12) hour = 0;
    return { hour, minute };
  };

  function getTodayKolkataString() {
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(new Date());
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return `${year}-${month}-${day}`;
  }

  function getKolkataTimeComponents() {
    const options = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false };
    const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
    let hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
    if (hour === 24) hour = 0;
    const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
    return { hour, minute };
  }

  const checkIsSessionEnded = (endTimeStr) => {
    if (!bookingDate) return false;
    const todayKolkata = getTodayKolkataString();
    if (bookingDate !== todayKolkata) return false;

    const { hour: currentHour, minute: currentMinute } = getKolkataTimeComponents();
    const { hour, minute } = parse24Time(endTimeStr);
    if (currentHour > hour) return true;
    if (currentHour === hour && currentMinute >= minute) return true;
    return false;
  };

  const getGstPercent = (srv) => {
    if (!srv) return 0;
    const cat = (srv.category || '').toUpperCase();
    if (cat === 'VET' || cat === 'HEALTH_CHECKUP') {
      return 0;
    }
    return srv.gst !== null && srv.gst !== undefined ? srv.gst : 18;
  };

  const fetchLiveSlots = async (serviceId, date) => {
    if (!serviceId || !date) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/search/services?date=${date}`);
      const matchingService = res.data.find(s => s.id === serviceId);
      if (matchingService) {
        setSessionSlots({
          morningRemaining: matchingService.morningRemaining ?? 5,
          morningCapacity: matchingService.morningCapacity ?? 5,
          afternoonRemaining: matchingService.afternoonRemaining ?? 5,
          afternoonCapacity: matchingService.afternoonCapacity ?? 5,
          morningBooked: matchingService.morningBooked ?? 0,
          afternoonBooked: matchingService.afternoonBooked ?? 0
        });
      }
    } catch (err) {
      console.error('Error fetching live slots:', err);
    }
  };

  useEffect(() => {
    if (bookingService && bookingDate && selectedSession) {
      const endTime = selectedSession === 'morning'
        ? (bookingService.morningEndTime || '13:00')
        : (bookingService.afternoonEndTime || '17:00');
      if (checkIsSessionEnded(endTime)) {
        setSelectedSession('');
      }
    }
  }, [bookingDate, bookingService, selectedSession]);

  const handleBookClick = (srv) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setBookingService(srv);
    setBookingDate(getTodayKolkataString());
    setBookingSlot(srv.timeSlots && srv.timeSlots.length > 0 ? srv.timeSlots[0] : '14:00 - 14:30');
    setIsSuccess(false);
    setErrorMessage(null);
    setBookingStep('CLINIC_INFO');

    setSessionSlots({
      morningRemaining: srv.morningRemaining ?? srv.morningCapacity ?? 5,
      morningCapacity: srv.morningCapacity ?? 5,
      afternoonRemaining: srv.afternoonRemaining ?? srv.afternoonCapacity ?? 5,
      afternoonCapacity: srv.afternoonCapacity ?? 5,
      morningBooked: srv.morningBooked ?? 0,
      afternoonBooked: srv.afternoonBooked ?? 0
    });
    setSelectedSession('');
    setDogName('');
    setDogAgeCategory('Puppy (0-1 Year)');
    setDogBreed('');
    setDogWeight('');
    setDogGender('Male');
    setDogAllergies('');
    setDogConditions('');
    setDogVaccinated('Fully Vaccinated');
  };

  const handleProceedToPayment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!bookingDate) {
      setErrorMessage('Please select an appointment date.');
      return;
    }
    if (!selectedSession) {
      setErrorMessage('Please select a session (Morning or Afternoon).');
      return;
    }
    if (!dogName.trim()) {
      setErrorMessage('Dog Name is required.');
      return;
    }

    const endTimeStr = selectedSession === 'morning'
      ? (bookingService.morningEndTime || '13:00')
      : (bookingService.afternoonEndTime || '17:00');

    if (checkIsSessionEnded(endTimeStr)) {
      setErrorMessage('This session has already ended for today. Please select another session or date.');
      setSelectedSession('');
      return;
    }

    const remaining = selectedSession === 'morning' ? sessionSlots.morningRemaining : sessionSlots.afternoonRemaining;
    if (remaining <= 0) {
      setErrorMessage('This session is fully booked. Please select another available session.');
      return;
    }

    setErrorMessage(null);
    await handleBookingSubmit(e);
  };

  const handleBookingSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const sdkLoaded = await loadRazorpaySDK();
      if (!sdkLoaded) {
        setErrorMessage('Failed to load Razorpay SDK. Please check your internet connection.');
        setIsLoading(false);
        return;
      }

      const token = accessToken || localStorage.getItem('pawmart_accessToken');
      if (!token) {
        setErrorMessage('Your session has expired. Please log in again to complete your booking.');
        setIsLoading(false);
        return;
      }

      // 1. Create Razorpay Order on Backend
      const orderPayload = {
        type: 'SERVICE',
        payload: {
          serviceId: bookingService.id,
          date: bookingDate,
          selectedSession,
          dogName,
          dogAgeCategory,
          dogBreed: dogBreed || undefined,
          dogWeight: dogWeight || undefined,
          dogGender,
          dogAllergies: dogAllergies || undefined,
          dogConditions: dogConditions || undefined,
          dogVaccinated
        }
      };

      const orderRes = await axios.post(
        `${import.meta.env.VITE_API_URL}/payments/razorpay/create-order`,
        orderPayload,
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );

      const { key, orderId, amount, currency } = orderRes.data.data;

      // Safely resolve active user for Razorpay prefill
      let activeUser = user;
      if (!activeUser) {
        try {
          const storedUser = localStorage.getItem('pawmart_user');
          if (storedUser) activeUser = JSON.parse(storedUser);
        } catch (e) {
          console.error('Error parsing stored user:', e);
        }
      }

      const prefillName = activeUser
        ? `${activeUser.firstName || ''} ${activeUser.lastName || ''}`.trim()
        : '';
      const prefillEmail = activeUser?.email || '';
      const prefillContact = activeUser?.phone || activeUser?.phoneNumber || '';

      // 2. Open Razorpay Checkout Modal
      const options = {
        key,
        amount,
        currency,
        name: 'PawMart',
        description: `Booking for ${bookingService.name}`,
        order_id: orderId,
        prefill: {
          name: prefillName || undefined,
          email: prefillEmail || undefined,
          contact: prefillContact || undefined
        },
        theme: {
          color: '#FF6B00'
        },
        handler: async function (response) {
          try {
            setIsLoading(true);
            await axios.post(
              `${import.meta.env.VITE_API_URL}/payments/razorpay/verify`,
              {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                type: 'SERVICE',
                payload: orderPayload.payload
              },
              { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
            );

            setIsSuccess(true);
            setTimeout(() => {
              setBookingService(null);
              navigate('/dashboard/buyer?tab=appointments');
            }, 2000);
          } catch (err) {
            console.error('Payment verification failed:', err);
            setErrorMessage(err.response?.data?.message || 'Payment verification failed. Please contact support.');
          } finally {
            setIsLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
            setErrorMessage('Payment was cancelled. Please try again when you\'re ready.');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setIsLoading(false);
        setErrorMessage(response.error?.description || 'Payment failed. Please try again.');
      });
      rzp.open();

    } catch (err) {
      console.error('Failed to initialize Razorpay booking:', err);
      if (err.response?.status === 401) {
        setErrorMessage('Your session has expired. Please log in again.');
      } else {
        setErrorMessage(err.response?.data?.message || err.message || 'Failed to initialize booking.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen pt-32 pb-32">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-6xl font-extrabold font-outfit tracking-tight text-secondary">Expert pet care.</h1>
            <p className="text-muted font-medium text-lg max-w-xl mt-4 leading-relaxed">Book trusted professionals for your pet's health, wellness, and happiness without leaving the platform.</p>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-12 border-b border-black/[0.05] pb-6">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                selectedCategory === cat 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-surface text-muted hover:bg-primary/10 hover:text-primary'
              }`}
            >
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>

        {/* Services Grid (Airbnb Style) */}
        {isServicesLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[32px] border border-black/[0.07] shadow-sm">
            <h3 className="text-xl font-bold text-secondary mb-2">No services available in this category yet.</h3>
            <p className="text-muted text-sm max-w-md mx-auto">
              Please check back later as our service providers frequently update their offerings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((srv, i) => {
              const providerName = srv.provider ? `${srv.provider.firstName} ${srv.provider.lastName}` : 'Expert Provider';
              return (
                <motion.div key={srv.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <GlassCard hoverEffect={true} className="!bg-surface border border-black/[0.07] h-full flex flex-col p-4">
                    <div className="relative aspect-[4/3] rounded-[20px] overflow-hidden mb-5">
                      <img src={srv.imageUrl || 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=800'} alt={srv.name} className="w-full h-full object-cover" />
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm flex items-center gap-2 text-secondary">
                        <Sparkles size={14} /> {srv.category}
                      </div>
                      <div className="absolute bottom-4 right-4 bg-primary text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-md">
                        {formatCurrency(srv.price)}
                      </div>
                    </div>
                    
                    <div className="px-2 flex flex-col flex-grow">
                      <div className="flex items-center gap-1.5 mb-2 text-accent">
                        <Star size={14} className="fill-accent"/>
                        <span className="text-sm font-bold text-secondary">5.0</span>
                      </div>
                      <h3 className="font-bold text-xl text-secondary mb-1 line-clamp-1">{srv.name}</h3>
                      <p className="text-sm font-semibold text-muted mb-2">{providerName}</p>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {srv.homeVisit && <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-bold">Home Visit</span>}
                        {srv.clinicVisit && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">Clinic Visit</span>}
                        {srv.online && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold">Online Consult</span>}
                      </div>
                      <p className="text-sm text-muted leading-relaxed line-clamp-2 mb-6">{srv.description}</p>
                      
                      <div className="mt-auto">
                        <PremiumButton onClick={() => handleBookClick(srv)} variant="primary" className="w-full">
                          Book Now
                        </PremiumButton>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {bookingService && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-secondary/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] overflow-hidden max-w-2xl w-full shadow-premium relative flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 md:p-8 border-b border-black/[0.05] flex justify-between items-center shrink-0">
                <div>
                  <p className="text-xs font-bold text-muted uppercase tracking-wider">
                    {isSuccess ? 'Booking Confirmed' : bookingStep === 'CLINIC_INFO' ? 'Clinic Profile' : 'Book Appointment'}
                  </p>
                  <h3 className="text-xl md:text-2xl font-bold font-outfit text-secondary mt-1">
                    {isSuccess ? 'Confirmed' : bookingStep === 'CLINIC_INFO' ? 'Clinic Information' : 'Booking Details'}
                  </h3>
                  {!isSuccess && <p className="text-xs text-muted font-bold tracking-wide uppercase mt-1">{bookingService.name}</p>}
                </div>
                <button
                  onClick={() => setBookingService(null)}
                  className="p-2 bg-surface hover:bg-accent/20 rounded-full transition-colors text-secondary"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Body Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar pb-32">
                {isSuccess ? (
                  <div className="text-center py-12 flex flex-col items-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 size={40} />
                    </motion.div>
                    <h3 className="text-3xl font-extrabold font-outfit text-secondary mb-2">Booking Confirmed!</h3>
                    <p className="text-sm text-muted font-medium px-4">
                      Your escrow payment is successfully held by PawMart. Appointment is scheduled with {bookingService.provider?.providerProfile?.businessName || (bookingService.provider?.firstName ? `${bookingService.provider.firstName} ${bookingService.provider.lastName}` : 'Expert Provider')}.
                    </p>
                  </div>
                ) : bookingStep === 'CLINIC_INFO' ? (
                  <div className="space-y-6">
                    {/* Clinic Banner & Logo Header */}
                    <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-r from-orange-400 to-amber-500 h-32 md:h-40 flex items-end">
                      {bookingService.provider?.providerProfile?.storeBanner ? (
                        <img 
                          src={getFullImageUrl(bookingService.provider.providerProfile.storeBanner)} 
                          alt="Clinic Banner" 
                          className="absolute inset-0 w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-accent/90 opacity-80" />
                      )}
                      
                      {/* Logo container */}
                      <div className="absolute -bottom-6 left-6 w-20 h-20 md:w-24 md:h-24 rounded-full bg-white p-1 border-2 border-primary shadow-lg overflow-hidden z-10 flex items-center justify-center">
                        {bookingService.provider?.providerProfile?.storeLogo ? (
                          <img 
                            src={getFullImageUrl(bookingService.provider.providerProfile.storeLogo)} 
                            alt="Clinic Logo" 
                            className="w-full h-full object-cover rounded-full" 
                          />
                        ) : (
                          <div className="w-full h-full bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-2xl font-outfit">
                            {bookingService.provider?.providerProfile?.businessName?.[0] || 'C'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Clinic Identity & Badge Credentials */}
                    <div className="pt-8 px-2 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h2 className="text-xl md:text-2xl font-bold font-outfit text-secondary leading-tight">
                            {bookingService.provider?.providerProfile?.businessName || "Clinic information unavailable"}
                          </h2>
                          <p className="text-xs text-muted font-bold tracking-wide uppercase mt-1">
                            Karnataka, IN
                          </p>
                        </div>
                        
                        {/* Credentials Badges */}
                        <div className="flex flex-wrap gap-1.5">
                          {bookingService.provider?.providerProfile?.licenseNumber && (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200/50 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              <Shield size={10} className="fill-green-700/10" /> Verified Clinic
                            </span>
                          )}
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/50 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <Award size={10} /> Licensed Provider
                          </span>
                          {bookingService.provider?.providerProfile?.experience && (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/50 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              <Sparkles size={10} /> {bookingService.provider.providerProfile.experience}+ Yrs Exp
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Brief details grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted font-medium bg-surface p-4 rounded-2xl border border-black/[0.04]">
                        <p className="flex items-center gap-2">
                          <MapPin size={14} className="text-primary" /> 
                          <span>{bookingService.provider?.providerProfile?.businessAddress || "Address details unavailable"}, {bookingService.provider?.providerProfile?.city || ""}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock size={14} className="text-primary" /> 
                          <span>Hours: {bookingService.provider?.providerProfile?.workingHours || "Working hours unavailable"}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone size={14} className="text-primary" /> 
                          <span>Contact: {bookingService.provider?.providerProfile?.contactNumber || "Phone unavailable"}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Mail size={14} className="text-primary" /> 
                          <span>Email: {bookingService.provider?.email || "Email unavailable"}</span>
                        </p>
                        {bookingService.provider?.providerProfile?.emergencyContact && (
                          <p className="flex items-center gap-2 md:col-span-2 text-error font-bold">
                            <CheckCircle2 size={14} className="text-error" /> 
                            <span>Emergency Contact: {bookingService.provider.providerProfile.emergencyContact}</span>
                          </p>
                        )}
                      </div>

                      {/* Clinic Overview Details */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-secondary text-sm">Clinic Overview</h4>
                        <p className="text-xs text-muted leading-relaxed font-medium">
                          {bookingService.provider?.providerProfile?.description || bookingService.provider?.providerProfile?.clinicDetails || "About the clinic description details not available at this moment. Highly professional pet grooming and clinical veterinary services."}
                        </p>
                      </div>

                      {/* Services & Facilities Offered */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h5 className="font-bold text-secondary text-xs uppercase tracking-wider text-primary">Services Offered</h5>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-2.5 py-1 bg-black/5 rounded-lg text-xs font-semibold text-secondary">{bookingService.name}</span>
                            <span className="px-2.5 py-1 bg-black/5 rounded-lg text-xs font-semibold text-secondary">General Consultation</span>
                            <span className="px-2.5 py-1 bg-black/5 rounded-lg text-xs font-semibold text-secondary">Pet Vaccination</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="font-bold text-secondary text-xs uppercase tracking-wider text-primary">Facilities Available</h5>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-2.5 py-1 bg-black/5 rounded-lg text-xs font-semibold text-secondary">Consultation Rooms</span>
                            <span className="px-2.5 py-1 bg-black/5 rounded-lg text-xs font-semibold text-secondary">Diagnostic Lab</span>
                            <span className="px-2.5 py-1 bg-black/5 rounded-lg text-xs font-semibold text-secondary">Languages: English, Kannada</span>
                          </div>
                        </div>
                      </div>

                      {/* Location Map Placeholder */}
                      <div className="space-y-2 pt-2">
                        <h4 className="font-bold text-secondary text-sm">Location Directions</h4>
                        <div className="flex justify-between items-center bg-surface border border-black/[0.07] p-4 rounded-xl">
                          <div className="text-xs font-medium text-muted">
                            📍 {bookingService.provider?.providerProfile?.businessAddress || "Address details unavailable"}
                          </div>
                          <PremiumButton 
                            onClick={() => alert("Get Directions map integration is coming soon!")}
                            variant="secondary" 
                            className="!py-2 !px-4 text-xs whitespace-nowrap"
                          >
                            Get Directions
                          </PremiumButton>
                        </div>
                      </div>

                      {/* Reviews & Ratings Section */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-secondary text-sm">Reviews & Ratings</h4>
                          <div className="flex items-center gap-1 text-accent text-xs font-bold bg-accent/10 py-1 px-2.5 rounded-full">
                            <Star size={12} className="fill-accent" />
                            <span>{bookingService.reviews?.length > 0 ? (bookingService.reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / bookingService.reviews.length).toFixed(1) : '4.8'} ({bookingService.reviews?.length || 0} reviews)</span>
                          </div>
                        </div>

                        {bookingService.reviews && bookingService.reviews.length > 0 ? (
                          <div className="space-y-3">
                            {bookingService.reviews.slice(0, 3).map(rev => (
                              <div key={rev.id} className="p-3 bg-surface rounded-xl border border-black/[0.04] space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-secondary font-outfit">
                                    {rev.user?.firstName} {rev.user?.lastName?.[0]}.
                                  </span>
                                  <div className="flex text-accent">
                                    {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                                      <Star key={i} size={10} className="fill-accent" />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-[11px] text-muted leading-relaxed font-medium">"{rev.comment || 'Excellent service!'}"</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 font-medium text-center py-4 bg-surface rounded-xl border border-dashed border-black/[0.05]">
                            No reviews yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Clinic Details Business Card */}
                    <div className="bg-surface border border-black/[0.07] p-5 rounded-[24px] space-y-3 text-sm">
                      <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
                        <h4 className="font-bold text-secondary uppercase tracking-wider text-[10px] text-muted">Clinic Details</h4>
                        <span className="px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider">{bookingService.category}</span>
                      </div>
                      <div>
                        <p className="font-bold text-secondary text-base">
                          {bookingService.provider?.providerProfile?.businessName || "Clinic information unavailable"}
                        </p>
                        <p className="text-xs text-muted font-medium mt-0.5">
                          Attending Doctor: {bookingService.provider?.firstName && bookingService.provider?.lastName ? `${bookingService.provider.firstName} ${bookingService.provider.lastName}` : "Expert Provider"}
                        </p>
                      </div>
                      <div className="text-xs text-muted space-y-1.5 font-medium pt-2 border-t border-black/5">
                        <p className="flex items-start gap-2"><span>📍</span> <span>{bookingService.provider?.providerProfile?.businessAddress || "Address details unavailable"}</span></p>
                        <p className="flex items-center gap-2"><span>📞</span> <span>{bookingService.provider?.providerProfile?.contactNumber || "Phone contact unavailable"}</span></p>
                        <p className="flex items-center gap-2"><span>🕒</span> <span>Hours: {bookingService.provider?.providerProfile?.workingHours || "Working hours unavailable"}</span></p>
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="bg-error/10 text-error text-sm font-bold px-4 py-3 rounded-xl border border-error/20">
                        {errorMessage}
                      </div>
                    )}

                    {/* Booking Date Selection */}
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Appointment Date</label>
                       <MinimalInput 
                         required 
                         type="date" 
                         value={bookingDate} 
                         min={getTodayKolkataString()}
                         onChange={(e) => {
                           setBookingDate(e.target.value);
                           setSelectedSession('');
                         }} 
                       />
                    </div>
 
                     {/* Configured Working Sessions (Practo style) */}
                     <div className="space-y-3">
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Available Sessions</label>
                       
                       {bookingDate && (bookingDate === getTodayKolkataString()) && 
                        checkIsSessionEnded(bookingService.morningEndTime || '13:00') && 
                        checkIsSessionEnded(bookingService.afternoonEndTime || '17:00') ? (
                          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold p-4 rounded-2xl">
                            ⚠️ No more booking sessions are available today. Please select another date.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Morning Session */}
                            <button
                              type="button"
                              disabled={
                                checkIsSessionEnded(bookingService.morningEndTime || '13:00') || 
                                (sessionSlots.morningRemaining <= 0)
                              }
                              onClick={() => setSelectedSession('morning')}
                              className={`p-4 rounded-[20px] border text-left flex flex-col justify-between transition-all ${
                                selectedSession === 'morning' 
                                  ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                                  : 'border-black/[0.07] hover:border-primary/45'
                              } ${
                                (checkIsSessionEnded(bookingService.morningEndTime || '13:00') || sessionSlots.morningRemaining <= 0)
                                  ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-100'
                                  : ''
                              }`}
                            >
                              <div className="flex justify-between items-center w-full mb-2">
                                <span className="font-bold text-sm text-secondary">🌅 Morning Session</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                  checkIsSessionEnded(bookingService.morningEndTime || '13:00') || sessionSlots.morningRemaining <= 0 
                                    ? 'text-red-500' 
                                    : sessionSlots.morningRemaining <= 2 
                                      ? 'text-amber-500' 
                                      : 'text-success'
                                }`}>
                                  {checkIsSessionEnded(bookingService.morningEndTime || '13:00') 
                                    ? '🔴 Session Ended' 
                                    : sessionSlots.morningRemaining <= 0 
                                      ? '🔴 FULLY BOOKED' 
                                      : `${sessionSlots.morningRemaining} Slots Available`}
                                </span>
                              </div>
                              <p className="text-xs text-muted font-bold tracking-wide">
                                {bookingService.morningStartTime || '09:00 AM'} - {bookingService.morningEndTime || '01:00 PM'}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-2 font-medium">Capacity: {sessionSlots.morningCapacity} Slots</p>
                            </button>

                            {/* Afternoon Session */}
                            <button
                              type="button"
                              disabled={
                                checkIsSessionEnded(bookingService.afternoonEndTime || '17:00') || 
                                (sessionSlots.afternoonRemaining <= 0)
                              }
                              onClick={() => setSelectedSession('afternoon')}
                              className={`p-4 rounded-[20px] border text-left flex flex-col justify-between transition-all ${
                                selectedSession === 'afternoon' 
                                  ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                                  : 'border-black/[0.07] hover:border-primary/45'
                              } ${
                                (checkIsSessionEnded(bookingService.afternoonEndTime || '17:00') || sessionSlots.afternoonRemaining <= 0)
                                  ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-100'
                                  : ''
                              }`}
                            >
                              <div className="flex justify-between items-center w-full mb-2">
                                <span className="font-bold text-sm text-secondary">☀️ Afternoon Session</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                  checkIsSessionEnded(bookingService.afternoonEndTime || '17:00') || sessionSlots.afternoonRemaining <= 0 
                                    ? 'text-red-500' 
                                    : sessionSlots.afternoonRemaining <= 2 
                                      ? 'text-amber-500' 
                                      : 'text-success'
                                }`}>
                                  {checkIsSessionEnded(bookingService.afternoonEndTime || '17:00') 
                                    ? '🔴 Session Ended' 
                                    : sessionSlots.afternoonRemaining <= 0 
                                      ? '🔴 FULLY BOOKED' 
                                      : `${sessionSlots.afternoonRemaining} Slots Available`}
                                </span>
                              </div>
                              <p className="text-xs text-muted font-bold tracking-wide">
                                {bookingService.afternoonStartTime || '02:30 PM'} - {bookingService.afternoonEndTime || '05:00 PM'}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-2 font-medium">Capacity: {sessionSlots.afternoonCapacity} Slots</p>
                            </button>
                          </div>
                        )}
                     </div>

                    {/* Dog Information Form */}
                    <div className="bg-surface/50 border border-black/[0.05] p-5 rounded-[24px] space-y-4">
                      <h4 className="font-bold text-secondary text-sm flex items-center gap-1.5">
                        🐕 Dog Patient Details
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <MinimalInput 
                          required 
                          label="Dog Name *" 
                          placeholder="e.g. Milo" 
                          value={dogName} 
                          onChange={(e) => setDogName(e.target.value)} 
                        />

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Age Category *</label>
                          <select 
                            required 
                            value={dogAgeCategory} 
                            onChange={(e) => setDogAgeCategory(e.target.value)}
                            className="w-full h-14 px-5 rounded-[16px] bg-white text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all"
                          >
                            <option value="Puppy (0–1 Year)">Puppy (0–1 Year)</option>
                            <option value="Young Adult (1–3 Years)">Young Adult (1–3 Years)</option>
                            <option value="Adult (3–7 Years)">Adult (3–7 Years)</option>
                            <option value="Senior (7+ Years)">Senior (7+ Years)</option>
                          </select>
                        </div>

                        <MinimalInput 
                          label="Breed (Optional)" 
                          placeholder="e.g. Golden Retriever" 
                          value={dogBreed} 
                          onChange={(e) => setDogBreed(e.target.value)} 
                        />

                        <MinimalInput 
                          label="Weight (Optional)" 
                          placeholder="e.g. 25 kg" 
                          value={dogWeight} 
                          onChange={(e) => setDogWeight(e.target.value)} 
                        />

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gender (Optional)</label>
                          <select 
                            value={dogGender} 
                            onChange={(e) => setDogGender(e.target.value)}
                            className="w-full h-14 px-5 rounded-[16px] bg-white text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vaccination Status (Optional)</label>
                          <select 
                            value={dogVaccinated} 
                            onChange={(e) => setDogVaccinated(e.target.value)}
                            className="w-full h-14 px-5 rounded-[16px] bg-white text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all"
                          >
                            <option value="Fully Vaccinated">Fully Vaccinated</option>
                            <option value="Partially Vaccinated">Partially Vaccinated</option>
                            <option value="Not Vaccinated">Not Vaccinated</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 pt-2">
                        <MinimalInput 
                          label="Allergies (Optional)" 
                          placeholder="e.g. Peanut allergy, Penicillin" 
                          value={dogAllergies} 
                          onChange={(e) => setDogAllergies(e.target.value)} 
                        />
                        <MinimalInput 
                          label="Medical Conditions (Optional)" 
                          placeholder="e.g. Hip dysplasia, Diabetes" 
                          value={dogConditions} 
                          onChange={(e) => setDogConditions(e.target.value)} 
                        />
                      </div>
                    </div>

                    {/* Booking Summary Box */}
                    <div className="bg-surface border border-black/[0.07] p-5 rounded-[24px] space-y-3 text-sm mt-6">
                      <h4 className="font-bold text-secondary uppercase tracking-wider text-[10px] text-muted border-b border-black/5 pb-2">Booking Summary</h4>
                      <div className="flex justify-between text-muted font-medium">
                        <span>Service Name:</span>
                        <span className="text-secondary font-bold text-right">{bookingService.name}</span>
                      </div>
                      <div className="flex justify-between text-muted font-medium">
                        <span>Appointment Date:</span>
                        <span className="text-secondary font-bold">{bookingDate || 'Not selected'}</span>
                      </div>
                      <div className="flex justify-between text-muted font-medium">
                        <span>Selected Session:</span>
                        <span className="text-secondary font-bold capitalize">{selectedSession ? `${selectedSession} Session` : 'Not selected'}</span>
                      </div>
                      {dogName && (
                        <div className="flex justify-between text-muted font-medium border-t border-black/5 pt-2.5">
                          <span>Patient Dog:</span>
                          <span className="text-secondary font-bold">{dogName} ({dogAgeCategory})</span>
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] font-semibold text-muted leading-relaxed text-center bg-black/5 p-3 rounded-xl border border-black/[0.03] mt-4">
                      🔒 Secured Escrow: Money is held safely by PawMart and released to the service provider only after service completion confirmation or after 72 hours.
                    </p>
                  </div>
                )}
              </div>

              {/* Sticky Booking Summary Footer */}
              {!isSuccess && (
                <div className="bg-white border-t border-black/[0.05] p-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 z-20 mt-auto shrink-0 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
                  {bookingStep === 'CLINIC_INFO' ? (
                    <div className="text-left">
                      <p className="text-xs font-bold text-muted uppercase tracking-wider">Booking Preview</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-400 font-medium mt-1">
                        <span>Fee: {formatCurrency(bookingService.price)}</span>
                        <span>•</span>
                        <span>Duration: {bookingService.duration} mins</span>
                        <span>•</span>
                        <span>Slots Today: {((sessionSlots.morningRemaining ?? 5) + (sessionSlots.afternoonRemaining ?? 5))} Available</span>
                      </div>
                      <p className="text-[11px] text-primary font-bold mt-1">
                        Sessions: Morning ({bookingService.morningStartTime || '09:00'} - {bookingService.morningEndTime || '13:00'}), Afternoon ({bookingService.afternoonStartTime || '14:00'} - {bookingService.afternoonEndTime || '18:00'})
                      </p>
                    </div>
                  ) : (
                    <div className="text-left">
                      <p className="text-xs font-bold text-muted uppercase tracking-wider">Price Breakdown</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-400 font-medium mt-1">
                        <span>Base: {formatCurrency(bookingService.price)}</span>
                        <span>•</span>
                        <span>
                          GST ({getGstPercent(bookingService)}%): {
                            getGstPercent(bookingService) === 0 
                              ? 'Exempt / 0%' 
                              : formatCurrency(bookingService.price * (getGstPercent(bookingService) / 100))
                          }
                        </span>
                      </div>
                      <p className="text-xl font-extrabold text-primary font-outfit mt-1">
                        Total Payable: {formatCurrency(bookingService.price * (1 + getGstPercent(bookingService) / 100))}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end sm:w-auto w-full">
                    {bookingStep === 'CLINIC_INFO' ? (
                      <PremiumButton onClick={() => setBookingStep('DETAILS')} className="w-full sm:w-auto !px-8">
                        Book Appointment
                      </PremiumButton>
                    ) : (
                      <>
                        <PremiumButton variant="ghost" onClick={() => setBookingStep('CLINIC_INFO')}>
                          Back
                        </PremiumButton>
                        <PremiumButton onClick={handleProceedToPayment} disabled={isLoading} className="w-full sm:w-auto !px-8">
                          {isLoading ? 'Initializing Payment...' : `Proceed to Payment (${formatCurrency(bookingService.price * (1 + getGstPercent(bookingService) / 100))})`}
                        </PremiumButton>
                      </>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
