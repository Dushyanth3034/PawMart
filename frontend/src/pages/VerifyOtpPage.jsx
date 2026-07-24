import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, PawPrint, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';

export default function VerifyOtpPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const navigate = useNavigate();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState('An OTP code has been sent to your email.');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60); // 60 seconds resend cooldown
  const [expiryTime, setExpiryTime] = useState(600); // 10 minutes OTP expiry

  const inputRefs = useRef([]);

  // Auto focus first input on load
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Expiry & Cooldown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setExpiryTime((prev) => (prev > 0 ? prev - 1 : 0));
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (value, idx) => {
    if (isNaN(value)) return;
    
    const newOtp = [...otp];
    newOtp[idx] = value.slice(-1); // Only keep last digit
    setOtp(newOtp);

    // Auto move to next input if we entered a digit
    if (value && idx < 5 && inputRefs.current[idx + 1]) {
      inputRefs.current[idx + 1].focus();
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace') {
      if (!otp[idx] && idx > 0 && inputRefs.current[idx - 1]) {
        // Clear previous input and focus it
        const newOtp = [...otp];
        newOtp[idx - 1] = '';
        setOtp(newOtp);
        inputRefs.current[idx - 1].focus();
      } else {
        const newOtp = [...otp];
        newOtp[idx] = '';
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pasteData)) return; // Must be exactly 6 digits

    const digits = pasteData.split('');
    setOtp(digits);
    
    // Focus last input
    if (inputRefs.current[5]) {
      inputRefs.current[5].focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);
    setInfoMessage('');

    const otpCode = otp.join('');
    if (otpCode.length < 6 || isNaN(otpCode)) {
      const errMsg = 'Please enter a valid 6-digit OTP.';
      setError(errMsg);
      toast.error(errMsg);
      return;
    }

    if (expiryTime === 0) {
      const errMsg = 'Your OTP has expired. Please request a new one.';
      setError(errMsg);
      toast.error(errMsg);
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/verify-otp`,
        { email, otp: otpCode },
        { withCredentials: true }
      );

      const { resetToken } = response.data;
      
      // Navigate to Reset Password Page with the token
      navigate('/reset-password', { state: { resetToken, email } });
    } catch (err) {
      const friendlyMsg = err.response?.data?.message || 'The OTP you entered is incorrect.';
      setError(friendlyMsg);
      toast.error(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;

    setError(null);
    setOtp(['', '', '', '', '', '']);
    setIsLoading(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/forgot-password`,
        { email },
        { withCredentials: true }
      );

      setInfoMessage('A new OTP has been sent to your email.');
      setCooldown(60);
      setExpiryTime(600);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
            <h2 className="text-3xl font-extrabold text-secondary font-outfit tracking-tight">Verify OTP</h2>
            <p className="text-muted font-medium mt-2">
              We sent a verification code to <strong className="text-secondary">{email}</strong>. Enter it below.
            </p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="w-full bg-error/10 border border-error/20 text-error rounded-[16px] p-4 text-sm font-bold flex items-center gap-3 mb-8">
              <AlertCircle size={18} /> <span>{error}</span>
            </motion.div>
          )}

          {infoMessage && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="w-full bg-success/10 border border-success/20 text-success rounded-[16px] p-4 text-sm font-bold flex items-center gap-3 mb-8">
              <CheckCircle2 size={18} /> <span>{infoMessage}</span>
            </motion.div>
          )}

          <form className="flex flex-col gap-8 w-full" onSubmit={handleVerify}>
            <div className="flex justify-between gap-2 md:gap-3" onPaste={handlePaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(e.target.value, idx)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  className="w-12 h-14 md:w-14 md:h-16 text-center text-xl font-extrabold text-secondary bg-surface rounded-[12px] border border-black/[0.07] outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all"
                />
              ))}
            </div>

            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted">
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-muted" />
                <span>Expires in: <span className={expiryTime < 60 ? 'text-error font-black' : 'text-secondary'}>{formatTime(expiryTime)}</span></span>
              </div>
              <div>
                {cooldown > 0 ? (
                  <span>Resend in {cooldown}s</span>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleResend}
                    className="text-primary hover:text-[#CC5200] hover:underline"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </div>

            <PremiumButton type="submit" disabled={isLoading} variant="primary" className="w-full mt-2 !py-5 !text-lg !rounded-[20px]">
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </PremiumButton>
          </form>

          <p className="mt-10 text-sm text-muted font-medium">
            Did not request this reset? <Link to="/login" className="text-primary font-bold hover:text-[#CC5200] transition-colors">Sign In</Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
