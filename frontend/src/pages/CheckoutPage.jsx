import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { clearCart } from '../redux/cartSlice.js';
import { fetchAddresses, addAddress } from '../redux/addressSlice.js';
import { createOrder } from '../redux/orderSlice.js';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Truck, CreditCard, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';
import MinimalInput from '../components/ui/MinimalInput.jsx';
import { formatCurrency } from '../utils/formatCurrency.js';
import { getFullImageUrl } from '../utils/imageHelper.js';
import { loadRazorpaySDK } from '../utils/razorpayHelper.js';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const { items, subtotal } = useSelector((state) => state.cart);
  const { items: addresses } = useSelector((state) => state.addresses);
  const { accessToken, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Karnataka');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('India');
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Coupon promo state
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const handleApplyPromo = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!couponCode || !couponCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }
    if (isCouponApplied) {
      toast.success('Promo code is already applied');
      return;
    }
    setIsValidatingPromo(true);
    try {
      const token = accessToken || localStorage.getItem('pawmart_accessToken');
      const payloadItems = items.map(item => ({
        productId: item.product?.id || item.product?._id || item.id,
        quantity: item.quantity,
        price: item.product?.price || 0
      }));

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/payment/validate-promo`, {
        code: couponCode,
        items: payloadItems
      }, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
        withCredentials: true
      });

      const { code, discountAmount } = response.data.data;
      setCouponCode(code);
      setCouponDiscount(discountAmount);
      setIsCouponApplied(true);
      toast.success(`Promo code ${code} applied! Saved ₹${discountAmount}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid promo code.');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setIsCouponApplied(false);
    setCouponDiscount(0);
    setCouponCode('');
    toast.success('Promo code removed');
  };

  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  useEffect(() => {
    const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
    if (defaultAddr) {
      setStreet(defaultAddr.street);
      setCity(defaultAddr.city);
      setState(defaultAddr.state || 'Karnataka');
      setZip(defaultAddr.postalCode);
      setCountry(defaultAddr.country || 'India');
      setSelectedAddressId(defaultAddr.id);
    }
  }, [addresses]);

  // Dynamic Calculation Totals (Flipkart Style)
  const totalOriginalPrice = items.reduce((sum, item) => sum + (item.product.originalPrice || item.product.price) * item.quantity, 0);
  const productDiscount = items.reduce((sum, item) => sum + (item.product.originalPrice ? (item.product.originalPrice - item.product.price) : 0) * item.quantity, 0);
  
  // GST calculated item-wise (CGST + SGST) based on discounted price
  const totalGst = items.reduce((sum, item) => sum + ((item.product.price * (item.product.gst || 18)) / 100) * item.quantity, 0);
  
  // Shipping Charges (Localisation Karnataka Warehouse)
  const shippingCharges = subtotal > 499 ? 0 : 40;
  const platformFee = 5;
  const packagingFee = 10;
  
  const grandTotal = subtotal - couponDiscount + totalGst + shippingCharges + platformFee + packagingFee;
  const totalSavings = productDiscount + couponDiscount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg('');

    try {
      let finalAddressId = selectedAddressId;
      
      // If fields changed or no address exists, create a new one
      const defaultAddr = addresses.find(a => a.id === selectedAddressId);
      if (!defaultAddr || street !== defaultAddr.street || zip !== defaultAddr.postalCode) {
        const newAddr = await dispatch(addAddress({ 
          street, 
          city, 
          state: 'Karnataka', 
          postalCode: zip, 
          country: 'India', 
          isDefault: true 
        })).unwrap();
        finalAddressId = newAddr.id;
      }

      const sdkLoaded = await loadRazorpaySDK();
      if (!sdkLoaded) {
        setErrorMsg('Failed to load Razorpay SDK. Please check your network connection.');
        setIsProcessing(false);
        return;
      }

      const token = accessToken || localStorage.getItem('pawmart_accessToken');
      if (!token) {
        setErrorMsg('Your session has expired. Please log in again.');
        setIsProcessing(false);
        return;
      }

      // 1. Create Razorpay Order on Backend
      const orderPayload = {
        type: 'PRODUCT',
        payload: {
          addressId: finalAddressId,
          items: items.map(item => ({
            productId: item.product.id,
            selectedColor: item.product.selectedColor || '',
            selectedSize: item.product.selectedSize || '',
            quantity: item.quantity,
            price: item.product.price
          })),
          couponCode: isCouponApplied ? couponCode : undefined
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
        description: 'Pet Products Checkout',
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
            setIsProcessing(true);
            await axios.post(
              `${import.meta.env.VITE_API_URL}/payments/razorpay/verify`,
              {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                type: 'PRODUCT',
                payload: orderPayload.payload
              },
              { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
            );

            setIsProcessing(false);
            setIsSuccess(true);
            dispatch(clearCart());
          } catch (err) {
            console.error('Order payment verification failed:', err);
            setErrorMsg(err.response?.data?.message || 'Payment verification failed. Please contact support.');
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setErrorMsg('Payment was cancelled. Please try again when you\'re ready.');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setIsProcessing(false);
        setErrorMsg(response.error?.description || 'Payment failed. Please try again.');
      });
      rzp.open();

    } catch (err) {
      setIsProcessing(false);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to initialize order payment.');
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen pt-32 pb-24 flex items-center justify-center bg-background">
        <GlassCard hoverEffect={false} className="max-w-xl mx-auto p-12 text-center !bg-white border-black/5 shadow-premium flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-8 shadow-inner"
          >
            <CheckCircle2 size={48} />
          </motion.div>
          <h1 className="text-4xl font-extrabold font-outfit text-secondary mb-4">Order Confirmed!</h1>
          <p className="text-lg text-muted font-medium leading-relaxed max-w-sm mb-10">
            Thank you for shopping at PawMart. Your premium order is being prepared for dispatch.
          </p>
          <Link to="/dashboard/buyer">
            <PremiumButton variant="primary" className="!py-4 !px-8 text-base">
              Go to Dashboard
            </PremiumButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pt-32 pb-24 relative">
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full mb-6"
            />
            <h3 className="font-extrabold text-2xl font-outfit text-secondary mb-2">Processing Payment...</h3>
            <p className="text-muted font-medium flex items-center gap-2">
              <ShieldCheck size={16} className="text-success" /> Secure Sandbox Gateway
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex flex-col gap-4 mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold font-outfit tracking-tight text-secondary">Secure Checkout.</h1>
          <p className="text-muted font-medium text-lg max-w-xl">Complete your shipping address and choose a payment method.</p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-24 bg-surface border border-black/[0.07] rounded-[32px] shadow-sm">
            <p className="text-lg text-muted font-medium mb-6">Your cart is empty. Please add products first.</p>
            <Link to="/shop">
              <PremiumButton variant="secondary">Back to Shop</PremiumButton>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            
            {/* Form details */}
            <div className="lg:col-span-2 flex flex-col gap-10">
              {errorMsg && (
                <div className="bg-red-50 text-red-500 p-4 rounded-2xl border border-red-100 text-sm font-bold">
                  {errorMsg}
                </div>
              )}

              <GlassCard hoverEffect={false} className="p-8 md:p-10 !bg-surface border-black/[0.07]">
                <h3 className="text-2xl font-extrabold font-outfit flex items-center gap-3 mb-8 text-secondary">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
                    <Truck size={18} />
                  </div>
                  Shipping Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <MinimalInput required label="Street Address" placeholder="e.g. 123 Luxury Ave, Indiranagar" value={street} onChange={(e) => setStreet(e.target.value)} className="sm:col-span-2" />
                  <MinimalInput required label="City" placeholder="e.g. Bengaluru" value={city} onChange={(e) => setCity(e.target.value)} />
                  <MinimalInput required readOnly label="State" value="Karnataka" className="bg-muted/5 opacity-80 cursor-not-allowed" />
                  <MinimalInput required label="Postal Code" placeholder="e.g. 560038" value={zip} onChange={(e) => setZip(e.target.value)} className="sm:col-span-2" />
                  <MinimalInput required readOnly label="Country" value="India" className="sm:col-span-2 bg-muted/5 opacity-80 cursor-not-allowed" />
                </div>
              </GlassCard>

              <GlassCard hoverEffect={false} className="p-8 md:p-10 !bg-surface border-black/[0.07]">
                <h3 className="text-2xl font-extrabold font-outfit flex items-center gap-3 mb-4 text-secondary">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
                    <CreditCard size={18} />
                  </div>
                  Payment Gateway
                </h3>
                <div className="bg-background border border-black/5 rounded-2xl p-6 flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-sm font-extrabold text-secondary">
                    <ShieldCheck size={20} className="text-success" /> 
                    <span>Razorpay Secure Gateway</span>
                  </div>
                  <p className="text-xs text-muted font-medium leading-relaxed">
                    Clicking <strong>Proceed to Payment</strong> will open Razorpay Checkout directly. You can securely select your preferred payment method (UPI, Card, Net Banking, Wallet) inside Razorpay.
                  </p>
                </div>
              </GlassCard>
            </div>

            {/* Checkout Totals */}
            <div className="flex flex-col gap-6">
              <GlassCard hoverEffect={false} className="p-8 lg:sticky lg:top-32 !bg-surface text-secondary border-black/[0.07]">
                <h3 className="text-2xl font-extrabold font-outfit mb-8">Order Summary</h3>
                
                {/* Expected Delivery Date & Badge */}
                <div className="mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-3">
                  <Truck size={20} className="text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Estimated Delivery</p>
                    <p className="text-sm font-bold text-secondary mt-0.5">By {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    <span className="inline-block mt-1 text-[10px] font-extrabold uppercase tracking-widest bg-success/15 text-success px-2 py-0.5 rounded-full">
                      Dispatched from Karnataka Warehouse
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mb-8">
                  {items.map(item => (
                    <div key={item.id || `${item.product.id}-${item.product.selectedColor || ''}-${item.product.selectedSize || ''}`} className="flex justify-between items-start pb-4 border-b border-black/[0.07]">
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-[12px] bg-background overflow-hidden shrink-0 border border-black/[0.07]">
                            <img src={getFullImageUrl(item.product.images?.[0]?.url || item.product.image)} className="w-full h-full object-cover" alt="" />
                         </div>
                         <div>
                             <p className="font-bold text-sm text-secondary line-clamp-1 max-w-[120px]">{item.product.name}</p>
                             {(item.product.selectedColor || item.product.selectedSize) && (
                               <p className="text-[10px] text-muted font-bold uppercase tracking-wider">
                                 {item.product.selectedColor ? `${item.product.selectedColor} ` : ''}
                                 {item.product.selectedSize ? `(${item.product.selectedSize})` : ''}
                               </p>
                             )}
                             <p className="text-xs text-muted font-medium">Qty: {item.quantity}</p>
                             {item.product.gst && (
                               <p className="text-[10px] text-muted font-semibold">Includes {item.product.gst}% GST</p>
                             )}
                         </div>
                      </div>
                       <span className="font-bold text-sm text-secondary">{formatCurrency(item.product.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Coupon promo UI */}
                <div className="flex flex-col gap-2 mb-6">
                  <label className="text-xs font-bold text-muted uppercase tracking-widest">Promo Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter promo code"
                      value={couponCode}
                      disabled={isCouponApplied}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-grow h-11 border border-black/10 rounded-xl px-3 text-sm font-bold text-secondary bg-white focus:border-primary focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    {isCouponApplied ? (
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="bg-red-50 text-red-600 border border-red-200 px-4 rounded-xl font-bold text-xs hover:bg-red-100 transition-all h-11"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={isValidatingPromo}
                        className="bg-secondary text-white px-4 rounded-xl font-bold text-xs hover:bg-secondary/90 transition-all h-11 disabled:opacity-50"
                      >
                        {isValidatingPromo ? 'Applying...' : 'Apply'}
                      </button>
                    )}
                  </div>
                  {isCouponApplied && (
                    <span className="text-xs font-bold text-success flex items-center gap-1">
                      ✓ Promo code {couponCode} applied successfully! (-₹{couponDiscount})
                    </span>
                  )}
                </div>

                {/* Flipkart-style Price Details */}
                <div className="flex flex-col gap-4 text-sm font-medium mb-8">
                  <div className="flex justify-between text-muted">
                    <span>Price ({items.reduce((s, i) => s + i.quantity, 0)} Items)</span>
                    <span className="font-bold text-secondary">{formatCurrency(totalOriginalPrice)}</span>
                  </div>
                  {productDiscount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Product Discount</span>
                      <span className="font-bold">-{formatCurrency(productDiscount)}</span>
                    </div>
                  )}
                  {isCouponApplied && (
                    <div className="flex justify-between text-success">
                      <span>Coupon Discount</span>
                      <span className="font-bold">-{formatCurrency(couponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted">
                    <span>GST (CGST + SGST)</span>
                    <span className="font-bold text-secondary">{formatCurrency(totalGst)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Platform Fee</span>
                    <span className="font-bold text-secondary">{formatCurrency(platformFee)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Packaging Fee</span>
                    <span className="font-bold text-secondary">{formatCurrency(packagingFee)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Delivery Charges</span>
                    <span className="font-bold text-success">{shippingCharges > 0 ? formatCurrency(shippingCharges) : 'FREE'}</span>
                  </div>
                  
                  <div className="h-px bg-black/[0.07] my-2" />
                  
                  <div className="flex justify-between items-center text-secondary">
                    <span className="text-lg font-bold">Total Amount</span>
                    <span className="text-3xl font-extrabold font-outfit text-primary">{formatCurrency(grandTotal)}</span>
                  </div>

                  {totalSavings > 0 && (
                    <div className="bg-success/10 text-success p-3 rounded-xl text-center text-xs font-bold mt-2">
                      You will save {formatCurrency(totalSavings)} on this order
                    </div>
                  )}
                </div>

                <button type="submit" disabled={isProcessing} className="w-full bg-primary hover:bg-primary/90 text-white py-5 rounded-[24px] font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70">
                  {isProcessing ? 'Initializing Payment...' : `Proceed to Payment (${formatCurrency(grandTotal)})`} <ArrowRight size={20}/>
                </button>
                <p className="text-[11px] font-semibold text-muted text-center mt-3">
                  🔒 Secure payment via Razorpay
                </p>
              </GlassCard>

              <div className="bg-success/10 border border-success/20 rounded-[20px] p-5 flex items-start gap-4">
                 <Sparkles className="text-success shrink-0" size={24} />
                 <div>
                    <h5 className="font-bold text-sm text-success">Premium Guarantee</h5>
                    <p className="text-xs text-success/80 mt-1 font-medium">Every order includes 24/7 premium support and a 30-day money-back guarantee.</p>
                 </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
