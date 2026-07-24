import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, AlertCircle, PawPrint, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';
import MinimalInput from '../components/ui/MinimalInput.jsx';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setEmailError('');
    setError(null);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const errMsg = 'Please enter a valid email address.';
      setEmailError(errMsg);
      toast.error(errMsg);
      return;
    }

    setIsLoading(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/forgot-password`,
        { email },
        { withCredentials: true }
      );
      
      // Navigate to OTP verification page
      navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const friendlyMsg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(friendlyMsg);
      toast.error(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden py-12 px-6">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-400/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} 
        className="w-full max-w-lg z-10"
      >
        <GlassCard hoverEffect={false} className="p-6 sm:p-10 md:p-14 !bg-white border-black/[0.07] shadow-premium flex flex-col items-center">
          
          <Link to="/" className="w-16 h-16 bg-primary text-white rounded-[24px] flex items-center justify-center shadow-lg mb-8 hover:bg-[#CC5200] transition-colors">
            <PawPrint size={32} />
          </Link>

          <div className="text-center mb-10 w-full">
            <h2 className="text-3xl font-extrabold text-secondary font-outfit tracking-tight">Forgot Password?</h2>
            <p className="text-muted font-medium mt-2">Enter your registered email address and we will send you a 6-digit OTP to reset your password.</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="w-full bg-error/10 border border-error/20 text-error rounded-[16px] p-4 text-sm font-bold flex items-center gap-3 mb-8">
              <AlertCircle size={18} /> <span>{error}</span>
            </motion.div>
          )}

          <form className="flex flex-col gap-6 w-full" onSubmit={handleRequestOtp}>
            <div className="relative">
              <MinimalInput 
                required 
                type="email" 
                label="Email Address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="you@example.com" 
                error={emailError}
              />
              <Mail className="absolute right-4 top-[42px] text-muted pointer-events-none" size={18} />
            </div>

            <PremiumButton type="submit" disabled={isLoading} variant="primary" className="w-full mt-4 !py-5 !text-lg !rounded-[20px]">
              {isLoading ? 'Sending OTP...' : 'Send OTP'} <ArrowRight size={20} className={isLoading ? 'hidden' : 'block'} />
            </PremiumButton>
          </form>

          <p className="mt-10 text-sm text-muted font-medium">
            Remembered your password? <Link to="/login" className="text-primary font-bold hover:text-[#CC5200] transition-colors">Back to Sign In</Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
