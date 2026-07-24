import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../redux/authSlice.js';
import { Mail, Lock, AlertCircle, Eye, EyeOff, PawPrint, ArrowRight, User } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';
import MinimalInput from '../components/ui/MinimalInput.jsx';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('BUYER');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setFirstNameError('');
    setLastNameError('');
    setEmailError('');
    setPasswordError('');
    setError(null);

    // Validate First Name
    if (!firstName.trim() || firstName.trim().length < 2) {
      const errMsg = 'Please enter your first name.';
      setFirstNameError(errMsg);
      toast.error(errMsg);
      return;
    }

    // Validate Last Name
    if (!lastName.trim() || lastName.trim().length < 2) {
      const errMsg = 'Please enter your last name.';
      setLastNameError(errMsg);
      toast.error(errMsg);
      return;
    }

    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const errMsg = 'Please enter a valid email address.';
      setEmailError(errMsg);
      toast.error(errMsg);
      return;
    }

    // Validate Password
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
        `${import.meta.env.VITE_API_URL}/auth/register`,
        { firstName, lastName, email, password, role },
        { withCredentials: true }
      );

      const { user, accessToken } = response.data;
      dispatch(setCredentials({ user, accessToken }));

      if (user.role === 'SELLER') navigate('/seller/home');
      else if (user.role === 'SERVICE_PROVIDER') navigate('/dashboard/provider');
      else navigate('/dashboard/buyer');

    } catch (err) {
      const friendlyMsg = err.response?.data?.message || 'An account with this email already exists.';
      setError(friendlyMsg);
      toast.error(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden py-12 px-6">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-sky-400/10 rounded-full blur-[120px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-xl z-10 my-20">
        <GlassCard hoverEffect={false} className="p-6 sm:p-10 md:p-14 !bg-surface border-black/[0.07] shadow-premium flex flex-col items-center">
          
          <Link to="/" className="w-16 h-16 bg-primary text-white rounded-[24px] flex items-center justify-center shadow-lg mb-8 hover:bg-accent transition-colors">
            <PawPrint size={32} />
          </Link>

          <div className="text-center mb-10 w-full">
            <h2 className="text-3xl font-extrabold text-secondary font-outfit tracking-tight">Create Account</h2>
            <p className="text-muted font-medium mt-2">Join PawMart and start buying or selling premium pet solutions.</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="w-full bg-error/10 border border-error/20 text-error rounded-[16px] p-4 text-sm font-bold flex items-center gap-3 mb-8">
              <AlertCircle size={18} /> <span>{error}</span>
            </motion.div>
          )}

          <form className="flex flex-col gap-6 w-full" onSubmit={handleRegister}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <MinimalInput required label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" error={firstNameError} />
              <MinimalInput required label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" error={lastNameError} />
            </div>

            <div className="relative">
              <MinimalInput required type="email" label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" error={emailError} />
              <Mail className="absolute right-4 top-[42px] text-muted pointer-events-none" size={18} />
            </div>

            <div className="relative">
              <label className="text-xs font-bold text-muted uppercase tracking-wider mb-1.5 block">Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className={`w-full h-14 px-5 pr-12 rounded-[16px] bg-surface text-secondary font-medium transition-all duration-300 outline-none border ${passwordError ? 'border-error focus:border-error focus:ring-error/10' : 'border-black/[0.07] focus:border-primary'} focus:bg-background focus:ring-4 focus:ring-primary/10`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[35px] p-2 text-muted hover:text-secondary rounded-full transition">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {passwordError && <p className="text-xs font-semibold text-error mt-1.5">{passwordError}</p>}
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-muted uppercase tracking-wider">I want to register as a</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'BUYER', label: 'Buyer' },
                  { id: 'SELLER', label: 'Seller' },
                  { id: 'SERVICE_PROVIDER', label: 'Provider' }
                ].map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`py-3.5 rounded-[16px] border-2 font-bold text-xs transition-all flex justify-center items-center gap-2 ${
                      role === r.id
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-surface border-black/[0.07] text-muted hover:border-primary/40 hover:text-secondary'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <PremiumButton type="submit" disabled={isLoading} variant="primary" className="w-full mt-4 !py-5 !text-lg !rounded-[20px]">
              {isLoading ? 'Creating Account...' : 'Sign Up'} <ArrowRight size={20} className={isLoading ? 'hidden' : 'block'} />
            </PremiumButton>
          </form>

          <p className="mt-10 text-sm text-muted font-medium">
            Already have an account? <Link to="/login" className="text-primary font-bold hover:text-accent transition-colors">Sign in</Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
