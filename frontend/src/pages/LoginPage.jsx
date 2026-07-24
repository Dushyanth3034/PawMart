import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../redux/authSlice.js';
import { Mail, Lock, AlertCircle, Eye, EyeOff, PawPrint, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useGoogleLogin } from '@react-oauth/google';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';
import MinimalInput from '../components/ui/MinimalInput.jsx';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleGoogleLogin = async (accessToken) => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/google`,
        { accessToken },
        { withCredentials: true }
      );

      const { user, accessToken: jwtToken } = response.data;
      dispatch(setCredentials({ user, accessToken: jwtToken }));
      toast.success('Successfully authenticated with Google!');

      if (user.role === 'ADMIN') navigate('/admin/dashboard');
      else if (user.role === 'SELLER') navigate('/seller/home');
      else if (user.role === 'SERVICE_PROVIDER') navigate('/dashboard/provider');
      else navigate('/dashboard/buyer');

    } catch (err) {
      const friendlyMsg = err.response?.data?.message || 'Google Sign-In failed.';
      setError(friendlyMsg);
      toast.error(friendlyMsg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (tokenResponse?.access_token) {
        await handleGoogleLogin(tokenResponse.access_token);
      } else {
        setIsGoogleLoading(false);
      }
    },
    onError: (err) => {
      console.error('Google Sign-In Error:', err);
      setError('Google Sign-In was cancelled or failed.');
      toast.error('Google Sign-In failed.');
      setIsGoogleLoading(false);
    }
  });

  const handleGoogleClick = () => {
    setIsGoogleLoading(true);
    setError(null);
    loginWithGoogle();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    setError(null);

    // Validate email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const errMsg = 'Please enter a valid email address.';
      setEmailError(errMsg);
      toast.error(errMsg);
      return;
    }

    // Validate password security requirements
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      const errMsg = 'Password must contain at least 8 characters, including an uppercase letter, lowercase letter, number, and special character.';
      setPasswordError(errMsg);
      toast.error(errMsg);
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      const { user, accessToken } = response.data;
      dispatch(setCredentials({ user, accessToken }));

      if (user.role === 'ADMIN') navigate('/admin/dashboard');
      else if (user.role === 'SELLER') navigate('/seller/home');
      else if (user.role === 'SERVICE_PROVIDER') navigate('/dashboard/provider');
      else navigate('/dashboard/buyer');

    } catch (err) {
      const friendlyMsg = err.response?.data?.message || 'Incorrect email or password.';
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

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-lg z-10">
        <GlassCard hoverEffect={false} className="p-6 sm:p-10 md:p-14 !bg-white border-black/[0.07] shadow-premium flex flex-col items-center">
          
          <Link to="/" className="w-16 h-16 bg-primary text-white rounded-[24px] flex items-center justify-center shadow-lg mb-8 hover:bg-[#CC5200] transition-colors">
            <PawPrint size={32} />
          </Link>

          <div className="text-center mb-10 w-full">
            <h2 className="text-3xl font-extrabold text-secondary font-outfit tracking-tight">Welcome Back</h2>
            <p className="text-muted font-medium mt-2">Sign in to manage your pets, orders, and premium services.</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="w-full bg-error/10 border border-error/20 text-error rounded-[16px] p-4 text-sm font-bold flex items-center gap-3 mb-8">
              <AlertCircle size={18} /> <span>{error}</span>
            </motion.div>
          )}

          <form className="flex flex-col gap-6 w-full" onSubmit={handleLogin}>
            <div className="relative">
              <MinimalInput required type="email" label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" error={emailError} />
              <Mail className="absolute right-4 top-[42px] text-muted pointer-events-none" size={18} />
            </div>

            <div className="relative">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-muted uppercase tracking-wider">Password</label>
                <Link to="/forgot-password" className="text-xs font-bold text-primary hover:text-[#CC5200] hover:underline transition-colors">Forgot password?</Link>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full h-14 px-5 pr-12 rounded-[16px] bg-surface text-secondary font-medium transition-all duration-300 outline-none border ${passwordError ? 'border-error focus:border-error focus:ring-error/10' : 'border-black/[0.07] focus:border-primary'} focus:bg-white focus:ring-4 focus:ring-primary/10`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[35px] p-2 text-muted hover:text-secondary rounded-full transition">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {passwordError && <p className="text-xs font-semibold text-error mt-1.5">{passwordError}</p>}
            </div>

            <PremiumButton type="submit" disabled={isLoading} variant="primary" className="w-full mt-4 !py-5 !text-lg !rounded-[20px]">
              {isLoading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={20} className={isLoading ? 'hidden' : 'block'} />
            </PremiumButton>
          </form>

          <div className="flex items-center gap-4 my-6 w-full text-muted text-xs font-bold uppercase tracking-wider">
            <div className="h-px bg-black/[0.07] flex-1"></div>
            <span>or continue with</span>
            <div className="h-px bg-black/[0.07] flex-1"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={isLoading || isGoogleLoading}
            aria-label="Continue with Google"
            className="w-full h-14 rounded-[20px] border border-black/[0.08] hover:border-black/20 bg-white hover:bg-black/[0.01] active:bg-black/[0.03] text-secondary font-bold text-base transition-all duration-300 flex items-center justify-center gap-3 shadow-sm hover:shadow-md outline-none focus:ring-4 focus:ring-black/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            <span>{isGoogleLoading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          <p className="mt-10 text-sm text-muted font-medium">
            Don't have an account? <Link to="/register" className="text-primary font-bold hover:text-[#CC5200] transition-colors">Create one now</Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
