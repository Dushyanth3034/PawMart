import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Calendar, Clock, PawPrint, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api.js';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';
import MinimalInput from '../components/ui/MinimalInput.jsx';

export default function AppointmentBookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  const [pet, setPet] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    
    if (location.state?.pet) {
      setPet(location.state.pet);
    } else {
      // If accessed directly without pet state, redirect back to wishlist
      navigate('/dashboard/buyer?tab=wishlist', { replace: true });
    }
  }, [isAuthenticated, location.state, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !time) {
      setErrorMessage('Please select a date and time.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload = {
        serviceId: `meet-${pet.id}`,
        petId: pet.id,
        serviceName: `Adoption Meet: ${pet.name}`,
        servicePrice: 0,
        serviceCategory: 'ADOPTION',
        date,
        startTime: time,
        endTime: `${parseInt(time.split(':')[0]) + 1}:00`,
        providerId: pet.ownerId || null // Ensure provider is passed if it exists
      };

      await api.post('/appointments', payload);
      
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/dashboard/buyer?tab=appointments', { replace: true });
      }, 2000);
      
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Failed to schedule appointment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!pet) return null;

  return (
    <div className="bg-[#F9FAFB] min-h-screen pt-32 pb-24 flex items-center justify-center px-6">
      <AnimatePresence>
        {isSuccess ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-black/[0.07] rounded-[32px] p-12 max-w-md w-full text-center shadow-premium"
          >
            <div className="w-20 h-20 rounded-full bg-secondary/5 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-secondary" size={40} />
            </div>
            <h2 className="text-3xl font-extrabold font-outfit text-secondary mb-4">Meeting Scheduled!</h2>
            <p className="text-muted font-medium mb-8">Your adoption meeting for {pet.name} has been confirmed. You will receive an email with details shortly.</p>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-3xl"
          >
            <div className="text-center mb-10">
              <h1 className="text-4xl font-extrabold font-outfit text-secondary tracking-tight">Schedule Meeting</h1>
              <p className="text-muted text-lg mt-3 font-medium">Book a time to meet your potential new best friend.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white border border-black/[0.07] rounded-[32px] overflow-hidden shadow-sm p-8">
              {/* Pet Details Section */}
              <div className="bg-surface rounded-[20px] p-6 flex flex-col justify-between border border-black/[0.05]">
                <div>
                  <div className="aspect-square w-full rounded-[16px] overflow-hidden mb-6 bg-white border border-black/[0.05]">
                    <img 
                      src={pet.image || pet.imageUrl || (pet.images && pet.images[0]?.url) || '/placeholder.svg'} 
                      alt={pet.name} 
                      className="w-full h-full object-cover mix-blend-multiply"
                    />
                  </div>
                  <h3 className="text-2xl font-bold text-secondary font-outfit mb-2">{pet.name}</h3>
                  <div className="flex flex-col gap-2 text-sm text-muted font-medium">
                    <span className="flex items-center gap-2"><PawPrint size={14} /> Breed: {pet.breed || 'Mixed'}</span>
                    <span className="flex items-center gap-2"><Clock size={14} /> Age: {pet.age || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              {/* Booking Form Section */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-6 justify-center">
                <div>
                  <label className="block text-sm font-bold text-secondary mb-2">Select Date</label>
                  <MinimalInput 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    required 
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-secondary mb-2">Select Time</label>
                  <MinimalInput 
                    type="time" 
                    value={time} 
                    onChange={(e) => setTime(e.target.value)} 
                    required 
                  />
                </div>

                {errorMessage && (
                  <div className="p-4 bg-error/10 text-error rounded-[16px] text-sm font-medium border border-error/20">
                    {errorMessage}
                  </div>
                )}

                <PremiumButton type="submit" variant="primary" className="w-full mt-4" disabled={isLoading}>
                  {isLoading ? 'Confirming...' : 'Confirm Meeting'}
                </PremiumButton>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
