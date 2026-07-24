import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, X, Calendar, CheckCircle2 } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toggleWishlistItem } from '../redux/wishlistSlice.js';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';
import MinimalInput from '../components/ui/MinimalInput.jsx';
import { getFullImageUrl } from '../utils/imageHelper.js';

import { useEffect } from 'react';
export default function AdoptionPage() {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((state) => state.auth);
  const { items: globalWishlist } = useSelector((state) => state.wishlist);
  const [toastMessage, setToastMessage] = useState(null);
  
  const [selectedPet, setSelectedPet] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [rescues, setRescues] = useState([]);

  useEffect(() => {
    if (selectedPet && user) {
      setPhone(user.phone || '');
    }
  }, [selectedPet, user]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/adoptions`);
        setRescues(response.data);
      } catch (error) {
        console.error('Failed to fetch pets:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPets();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleWishlist = async (rescue) => {
    if (!accessToken) {
      showToast('Please login to add to wishlist');
      return;
    }

    try {
      await dispatch(toggleWishlistItem({ id: rescue.id, name: rescue.name, price: 0, image: rescue.image, category: 'adoption' })).unwrap();
      showToast(`Wishlist updated for ${rescue.name} ✨`);
    } catch (error) {
      showToast('Failed to update wishlist');
    }
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    if (!accessToken || !user) {
      showToast('Please login to schedule an adoption meeting');
      return;
    }
    
    setIsBooking(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/adoptions/request`,
        {
          petId: selectedPet.id,
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone,
          preferredDate: date,
          preferredTime: time,
          reason,
          notes
        },
        { headers: { Authorization: `Bearer ${accessToken}` }, withCredentials: true }
      );
      
      setIsSuccess(true);
      setTimeout(() => {
        setSelectedPet(null);
        setIsSuccess(false);
        setDate('');
        setTime('');
        setPhone('');
        setReason('');
        setNotes('');
      }, 2500);

    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to submit adoption request.');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="bg-background min-h-screen pt-32 pb-32">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 bg-[#111827] text-white px-6 py-4 rounded-full shadow-float flex items-center gap-3 text-sm font-semibold tracking-wide"
          >
            <span>🐾</span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-20">
          <div>
            <h1 className="text-4xl md:text-6xl font-extrabold font-outfit tracking-tight text-secondary">Find a friend.</h1>
            <p className="text-muted font-medium text-lg max-w-xl mt-4 leading-relaxed">Connect with vetted shelters and rescue groups to bring home your new companion.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : rescues.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[32px] border border-black/[0.07] shadow-sm">
            <h3 className="text-xl font-bold text-secondary mb-2">No pets available for adoption yet.</h3>
            <p className="text-muted text-sm max-w-md mx-auto">
              Please check back later as shelters frequently update their listings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            {rescues.map((rescue, index) => {
              const inWishlist = globalWishlist.some(w => w.petId === rescue.id);
              const petAge = rescue.age || (rescue.birthday ? `${Math.floor((new Date() - new Date(rescue.birthday)) / (1000 * 60 * 60 * 24 * 365.25))} years` : 'Unknown');
              const ownerName = rescue.owner ? `${rescue.owner.firstName} ${rescue.owner.lastName}` : 'Local Shelter';
              
              return (
                <motion.div 
                  key={rescue.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group bg-white border border-black/[0.07] rounded-[32px] overflow-hidden hover:shadow-xl hover:shadow-black/5 transition-all duration-300 flex flex-col"
                >
                  <div className="relative h-64 overflow-hidden bg-surface">
                    <Link to={`/product/${rescue.id}`}>
                      <img 
                        src={getFullImageUrl(rescue.imageUrl) || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800'} 
                        alt={rescue.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer" 
                      />
                    </Link>
                    <button 
                      onClick={() => handleWishlist(rescue)}
                      className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white transition-colors border border-black/[0.07] z-10"
                    >
                      <Heart size={20} className={inWishlist ? 'fill-error text-error' : 'text-secondary'} />
                    </button>
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-primary border border-black/[0.07]">
                      {rescue.breed}
                    </div>
                  </div>
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <Link to={`/product/${rescue.id}`}>
                        <h3 className="text-2xl font-extrabold text-secondary font-outfit hover:text-primary transition-colors cursor-pointer leading-tight">{rescue.name}</h3>
                      </Link>
                      <span className="text-xs font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-xl shrink-0 whitespace-nowrap">
                        {rescue.price > 0 ? `Fee: ₹${rescue.price.toLocaleString('en-IN')}` : 'Free Adoption'}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 text-xs font-semibold text-muted mb-4">
                      <div className="flex items-center text-sm font-bold text-secondary">
                        <span className="text-primary mr-1">Clinic:</span> {ownerName}
                      </div>
                      <div className="flex items-center">
                        <MapPin size={14} className="mr-1 opacity-50 text-secondary" />
                        <span>{rescue.location || 'Adoption Center'}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-6">
                      <span className="px-2.5 py-1 bg-surface text-secondary text-[11px] font-bold rounded-md">Age: {petAge}</span>
                      <span className="px-2.5 py-1 bg-surface text-secondary text-[11px] font-bold rounded-md">{rescue.gender}</span>
                      {rescue.vaccinationStatus && (
                        <span className="px-2.5 py-1 bg-surface text-secondary text-[11px] font-bold rounded-md capitalize">
                          {rescue.vaccinationStatus.toLowerCase().replace(/_/g, ' ')}
                        </span>
                      )}
                      {rescue.healthStatus && (
                        <span className="px-2.5 py-1 bg-surface text-secondary text-[11px] font-bold rounded-md capitalize">
                          {rescue.healthStatus.toLowerCase().replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4 mb-4">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        (rescue.availability && rescue.status === 'ACTIVE') ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                      }`}>
                        {(rescue.availability && rescue.status === 'ACTIVE') ? 'Available for Adoption' : 'Already Adopted'}
                      </span>
                    </div>

                    <div className="mt-auto pt-4 border-t border-black/5">
                      <PremiumButton 
                        onClick={() => setSelectedPet(rescue)} 
                        disabled={!(rescue.availability && rescue.status === 'ACTIVE')}
                        variant="primary" 
                        className="w-full justify-center !text-xs !py-3"
                      >
                        Schedule Adoption Meeting
                      </PremiumButton>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedPet && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#111827]/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] overflow-y-auto max-h-[85vh] max-w-lg w-full shadow-premium relative p-8 custom-scrollbar"
            >
              <button onClick={() => setSelectedPet(null)} className="absolute top-6 right-6 p-2 bg-surface hover:bg-black/[0.07] rounded-full transition-colors text-secondary z-10">
                <X size={20} />
              </button>

              {isSuccess ? (
                <div className="text-center py-12 flex flex-col items-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} />
                  </motion.div>
                  <h3 className="text-3xl font-extrabold font-outfit text-secondary mb-2">Request Submitted!</h3>
                  <p className="text-sm text-muted font-medium px-4">Your adoption application for {selectedPet.name} has been sent successfully. The provider will review it and contact you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleBookSubmit} className="flex flex-col gap-6">
                  <div className="mb-2">
                    <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-1">Adopt {selectedPet.name}</h2>
                    <p className="text-sm font-medium text-muted flex items-center gap-1.5"><MapPin size={14} className="text-accent" /> {selectedPet.location}</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <MinimalInput 
                      disabled
                      label="Applicant Name" 
                      value={user ? `${user.firstName} ${user.lastName}` : ''} 
                    />

                    <MinimalInput 
                      disabled
                      label="Email Address" 
                      value={user ? user.email : ''} 
                    />

                    <MinimalInput 
                      required
                      label="Phone Number" 
                      placeholder="e.g. +91 9876543210"
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                    />

                    <MinimalInput 
                      required 
                      type="date" 
                      label="Preferred Meeting Date" 
                      value={date} 
                      onChange={(e) => setDate(e.target.value)} 
                    />
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Preferred Meeting Time</label>
                      <select 
                        required
                        value={time} 
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full h-14 px-5 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all"
                      >
                        <option value="" disabled>Choose a time</option>
                        <option value="10:00 AM">10:00 AM</option>
                        <option value="11:00 AM">11:00 AM</option>
                        <option value="12:00 PM">12:00 PM</option>
                        <option value="02:00 PM">02:00 PM</option>
                        <option value="03:00 PM">03:00 PM</option>
                        <option value="04:00 PM">04:00 PM</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reason for Adoption (Optional)</label>
                      <textarea 
                        rows={3} 
                        placeholder="Tell us why you would like to adopt this pet..."
                        value={reason} 
                        onChange={(e) => setReason(e.target.value)} 
                        className="w-full p-4 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all resize-none text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Additional Notes (Optional)</label>
                      <textarea 
                        rows={2} 
                        placeholder="Any additional details or questions..."
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        className="w-full p-4 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all resize-none text-sm"
                      />
                    </div>
                  </div>

                  <PremiumButton type="submit" disabled={isBooking} variant="primary" className="w-full mt-4">
                    {isBooking ? 'Submitting Application...' : 'Schedule Adoption Meeting'}
                  </PremiumButton>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
