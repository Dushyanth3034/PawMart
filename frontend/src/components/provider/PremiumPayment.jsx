import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft, CreditCard, Landmark, Check } from 'lucide-react';
import GlassCard from '../ui/GlassCard.jsx';
import PremiumButton from '../ui/PremiumButton.jsx';
import MinimalInput from '../ui/MinimalInput.jsx';

export default function PremiumPayment() {
  const { accessToken, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [upiId, setUpiId] = useState('');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    holder: '',
    expiry: '',
    cvv: ''
  });
  const [selectedBank, setSelectedBank] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/provider/profile`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        setProfile(response.data.data);
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };
    if (accessToken) {
      fetchProfile();
    }
  }, [accessToken]);

  const handlePay = async () => {
    // Validate inputs based on payment method
    if (paymentMethod === 'UPI') {
      if (!upiId) {
        toast.error('UPI ID is required');
        return;
      }
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upiRegex.test(upiId)) {
        toast.error('Please enter a valid UPI ID (e.g. name@bank)');
        return;
      }
    } else if (paymentMethod === 'CARD') {
      if (!cardDetails.number || !cardDetails.holder || !cardDetails.expiry || !cardDetails.cvv) {
        toast.error('All card details are required');
        return;
      }
      const cleanNum = cardDetails.number.replace(/\s+/g, '');
      if (!/^\d{16}$/.test(cleanNum)) {
        toast.error('Card number must be exactly 16 digits');
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardDetails.expiry)) {
        toast.error('Expiry date must be MM/YY format');
        return;
      }
      if (!/^\d{3}$/.test(cardDetails.cvv)) {
        toast.error('CVV must be exactly 3 digits');
        return;
      }
    } else if (paymentMethod === 'BANK') {
      if (!selectedBank) {
        toast.error('Please select a bank');
        return;
      }
    }

    try {
      setLoading(true);
      // Simulate transaction API call
      await axios.post(`${import.meta.env.VITE_API_URL}/provider/premium-payment`, {
        paymentMethod,
        upiId: paymentMethod === 'UPI' ? upiId : null,
        bankName: paymentMethod === 'BANK' ? selectedBank : null
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      
      toast.success('Payment of ₹99 completed successfully! One unused listing credit added.');
      
      // Store reopening flag in sessionStorage so PetManagement knows to reopen modal
      sessionStorage.setItem('reopenListPet', 'true');
      
      // Redirect back to Pet Listings tab
      navigate('/dashboard/provider?tab=pets', { replace: true });
    } catch (err) {
      toast.error('Payment processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/dashboard/provider?tab=pets')}
        className="flex items-center gap-2 text-muted hover:text-secondary font-bold text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Listings
      </button>

      <GlassCard className="p-8 border-black/[0.04] space-y-6">
        <div>
          <span className="bg-primary/10 text-primary text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full">
            Checkout Simulator
          </span>
          <h2 className="text-3xl font-extrabold text-secondary font-outfit mt-3">Premium Listing</h2>
          <p className="text-xs font-semibold text-muted mt-1">Activate one premium pet adoption listing credit.</p>
        </div>

        {/* Invoice Summary */}
        <div className="border-t border-b border-black/5 py-4 space-y-3 font-semibold text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Clinic Name</span>
            <span className="text-secondary">{profile?.clinicName || profile?.businessName || 'Adoption Clinic'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Listing Summary</span>
            <span className="text-secondary">1 Premium Listing Credit</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-black/5">
            <span className="text-secondary text-base font-extrabold">Amount due</span>
            <span className="text-primary text-2xl font-extrabold font-outfit">₹99</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Select Payment Method</h4>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'UPI', label: 'UPI / QR', icon: ShieldCheck },
              { id: 'CARD', label: 'Cards', icon: CreditCard },
              { id: 'BANK', label: 'NetBanking', icon: Landmark }
            ].map(method => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 font-bold text-xs ${
                  paymentMethod === method.id 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-black/5 hover:border-black/10 text-muted hover:text-secondary'
                }`}
              >
                <method.icon size={20} />
                {method.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Payment Method Inputs */}
        <div className="space-y-4 pt-2 border-t border-black/5">
          {paymentMethod === 'UPI' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">UPI ID</label>
              <MinimalInput 
                required
                type="text" 
                placeholder="e.g. name@bank" 
                value={upiId} 
                onChange={(e) => setUpiId(e.target.value)} 
              />
            </div>
          )}

          {paymentMethod === 'CARD' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Card Number</label>
                <MinimalInput 
                  required
                  type="text" 
                  maxLength={19}
                  placeholder="e.g. 1234 5678 1234 5678" 
                  value={cardDetails.number} 
                  onChange={(e) => {
                    // Format with spaces
                    const val = e.target.value.replace(/\D/g, '').match(/.{1,4}/g)?.join(' ') || '';
                    setCardDetails({ ...cardDetails, number: val.slice(0, 19) });
                  }} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Card Holder Name</label>
                <MinimalInput 
                  required
                  type="text" 
                  placeholder="e.g. John Doe" 
                  value={cardDetails.holder} 
                  onChange={(e) => setCardDetails({ ...cardDetails, holder: e.target.value })} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Expiry Date</label>
                  <MinimalInput 
                    required
                    type="text" 
                    maxLength={5}
                    placeholder="MM/YY" 
                    value={cardDetails.expiry} 
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 2) {
                        val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                      }
                      setCardDetails({ ...cardDetails, expiry: val });
                    }} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">CVV</label>
                  <MinimalInput 
                    required
                    type="password" 
                    maxLength={3}
                    placeholder="123" 
                    value={cardDetails.cvv} 
                    onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value.replace(/\D/g, '') })} 
                  />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'BANK' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Select Bank</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full h-14 px-5 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all"
              >
                <option value="">-- Choose your Bank --</option>
                <option value="SBI">State Bank of India (SBI)</option>
                <option value="HDFC">HDFC Bank</option>
                <option value="ICICI">ICICI Bank</option>
                <option value="AXIS">Axis Bank</option>
                <option value="KOTAK">Kotak Mahindra Bank</option>
              </select>
            </div>
          )}
        </div>

        {/* Proceed Button */}
        <div className="pt-4 flex flex-col gap-3">
          <PremiumButton 
            onClick={handlePay} 
            disabled={loading}
            variant="primary" 
            className="w-full flex items-center justify-center gap-2 !py-3.5"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Check size={16} /> Proceed to Pay ₹99
              </>
            )}
          </PremiumButton>
          <button 
            onClick={() => navigate('/dashboard/provider?tab=pets')}
            className="text-center text-xs font-bold text-muted hover:underline"
          >
            Cancel and Return
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
