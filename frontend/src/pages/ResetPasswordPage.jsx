import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, PawPrint, CheckCircle2, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get resetToken and email from location state
  const resetToken = location.state?.resetToken || '';
  const email = location.state?.email || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Requirement status flags
  const hasMinLen = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const criteriaMetCount = [hasMinLen, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const isFormValid = criteriaMetCount === 5 && password === confirmPassword && confirmPassword.length > 0;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (!resetToken) {
      const errMsg = 'Your password reset session has expired. Please request a new OTP.';
      setError(errMsg);
      toast.error(errMsg);
      return;
    }

    if (criteriaMetCount < 5) {
      const errMsg = 'Password must contain at least 8 characters, including an uppercase letter, lowercase letter, number, and special character.';
      setError(errMsg);
      toast.error(errMsg);
      return;
    }

    if (password !== confirmPassword) {
      const errMsg = 'Passwords do not match.';
      setError(errMsg);
      toast.error(errMsg);
      return;
    }

    setIsLoading(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/reset-password`,
        { resetToken, newPassword: password, confirmPassword },
        { withCredentials: true }
      );

      // Show toast on success
      toast.success('Password changed successfully.', { duration: 5000 });
      
      // Redirect to Login Page
      navigate('/login');
    } catch (err) {
      const friendlyMsg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(friendlyMsg);
      toast.error(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthLabel = () => {
    if (password.length === 0) return { label: 'None', color: 'bg-gray-200' };
    if (criteriaMetCount <= 2) return { label: 'Weak', color: 'bg-error' };
    if (criteriaMetCount <= 4) return { label: 'Medium', color: 'bg-amber-500' };
    return { label: 'Strong', color: 'bg-success' };
  };

  const strength = getStrengthLabel();

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
            <h2 className="text-3xl font-extrabold text-secondary font-outfit tracking-tight">Reset Password</h2>
            <p className="text-muted font-medium mt-2">Create a secure new password for your PawMart account.</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="w-full bg-error/10 border border-error/20 text-error rounded-[16px] p-4 text-sm font-bold flex items-center gap-3 mb-8">
              <AlertCircle size={18} /> <span>{error}</span>
            </motion.div>
          )}

          {!resetToken && (
            <motion.div className="w-full bg-error/10 border border-error/20 text-error rounded-[16px] p-4 text-sm font-bold flex items-center gap-3 mb-8">
              <AlertCircle size={18} /> <span>No reset token session detected. Please start over from the forgot password view.</span>
            </motion.div>
          )}

          <form className="flex flex-col gap-6 w-full" onSubmit={handleResetPassword}>
            {/* New Password */}
            <div className="relative">
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-14 px-5 pr-12 rounded-[16px] bg-surface text-secondary font-medium transition-all outline-none border border-black/[0.07] focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-muted hover:text-secondary rounded-full transition">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Password Strength Meter */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-muted">Password Strength</span>
                <span className={strength.label === 'Strong' ? 'text-success' : strength.label === 'Medium' ? 'text-amber-500' : 'text-error'}>
                  {strength.label}
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex gap-1">
                <div className={`h-full ${strength.color} transition-all`} style={{ width: `${(criteriaMetCount / 5) * 100}%` }} />
              </div>
              
              {/* Requirements Checklist */}
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-bold">
                <div className={`flex items-center gap-1.5 ${hasMinLen ? 'text-success' : 'text-muted'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${hasMinLen ? 'bg-success' : 'bg-gray-300'}`} />
                  Min 8 Characters
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-success' : 'text-muted'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${hasUpper ? 'bg-success' : 'bg-gray-300'}`} />
                  Uppercase Letter
                </div>
                <div className={`flex items-center gap-1.5 ${hasLower ? 'text-success' : 'text-muted'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${hasLower ? 'bg-success' : 'bg-gray-300'}`} />
                  Lowercase Letter
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-success' : 'text-muted'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${hasNumber ? 'bg-success' : 'bg-gray-300'}`} />
                  At least 1 Number
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-success' : 'text-muted'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${hasSpecial ? 'bg-success' : 'bg-gray-300'}`} />
                  Special Character
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-14 px-5 pr-12 rounded-[16px] bg-surface text-secondary font-medium transition-all outline-none border border-black/[0.07] focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-xs font-bold text-error mt-1.5">Passwords do not match.</p>
              )}
            </div>

            <PremiumButton 
              type="submit" 
              disabled={isLoading || !isFormValid} 
              variant="primary" 
              className={`w-full mt-4 !py-5 !text-lg !rounded-[20px] ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </PremiumButton>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
}
