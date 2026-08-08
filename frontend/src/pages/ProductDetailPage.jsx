import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToCartAPI } from '../redux/cartSlice.js';
import { toggleWishlistItem, fetchWishlist } from '../redux/wishlistSlice.js';
import { clearCredentials } from '../redux/authSlice.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Shield, Play, ShoppingBag, ArrowLeft, Truck, RefreshCcw, Heart, Calendar, Check, Trash, X, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';
import MinimalInput from '../components/ui/MinimalInput.jsx';
import { formatCurrency } from '../utils/formatCurrency.js';
import axios from 'axios';
import { getFullImageUrl } from '../utils/imageHelper.js';

export default function ProductDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: wishlistItems } = useSelector(state => state.wishlist);
  const { isAuthenticated, user } = useSelector(state => state.auth || {});

  const [activeTab, setActiveTab] = useState('desc');
  const [view360, setView360] = useState(false);
  const [frame360, setFrame360] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);
  
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Variant States
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Zoom on hover state
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Swipe support refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Reviews-specific states
  const [reviews, setReviews] = useState([]);
  const [isEligible, setIsEligible] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [filesInput, setFilesInput] = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [showEligibilityError, setShowEligibilityError] = useState(false);

  // Related Pets states
  const [moreFromCenter, setMoreFromCenter] = useState([]);
  const [similarBreeds, setSimilarBreeds] = useState([]);
  const [recentlyAdded, setRecentlyAdded] = useState([]);

  // Adoption meeting states
  const [isAdoptionModalOpen, setIsAdoptionModalOpen] = useState(false);
  const [adoptionDate, setAdoptionDate] = useState('');
  const [adoptionTime, setAdoptionTime] = useState('10:00 AM');
  const [adoptionPhone, setAdoptionPhone] = useState('');
  const [adoptionReason, setAdoptionReason] = useState('');
  const [adoptionNotes, setAdoptionNotes] = useState('');
  const [isAdoptionSubmitting, setIsAdoptionSubmitting] = useState(false);

  useEffect(() => {
    if (isAdoptionModalOpen && user) {
      setAdoptionPhone(user.phone || '');
    }
  }, [isAdoptionModalOpen, user]);

  const handleAdoptionSubmit = async (e) => {
    e.preventDefault();
    if (!adoptionDate) {
      toast.error('Please select a date');
      return;
    }
    try {
      setIsAdoptionSubmitting(true);
      const token = localStorage.getItem('pawmart_accessToken') || accessToken;
      await axios.post(
        `${import.meta.env.VITE_API_URL}/adoptions/request`,
        {
          petId: product.id,
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: adoptionPhone,
          preferredDate: adoptionDate,
          preferredTime: adoptionTime,
          reason: adoptionReason,
          notes: adoptionNotes
        },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      toast.success(`Adoption request submitted for ${product.name}! ✨`);
      setIsAdoptionModalOpen(false);
      setAdoptionDate('');
      setAdoptionPhone('');
      setAdoptionReason('');
      setAdoptionNotes('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit adoption request');
    } finally {
      setIsAdoptionSubmitting(false);
    }
  };

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/search/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/reviews/product/${id}`);
      setReviews(res.data.data || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const checkEligibility = async () => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('pawmart_accessToken');
    if (!token) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/reviews/check-eligibility?productId=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setIsEligible(res.data.eligible);
    } catch (err) {
      console.error('Error checking review eligibility:', err);
      if (err.response?.status === 401) {
        dispatch(clearCredentials());
      }
    }
  };

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [id]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'BUYER') {
      dispatch(fetchWishlist());
      checkEligibility();
    }
  }, [dispatch, isAuthenticated, user?.role, id]);

  useEffect(() => {
    const fetchRelatedPets = async () => {
      if (product && product.isPet) {
        try {
          const centerRes = await axios.get(`${import.meta.env.VITE_API_URL}/adoptions?sellerId=${product.sellerId}&excludeId=${product.id}&limit=4`);
          setMoreFromCenter(centerRes.data || []);
          
          if (product.breed) {
            const breedRes = await axios.get(`${import.meta.env.VITE_API_URL}/adoptions?breed=${product.breed}&excludeId=${product.id}&limit=4`);
            setSimilarBreeds(breedRes.data || []);
          }
          
          const recentRes = await axios.get(`${import.meta.env.VITE_API_URL}/adoptions?excludeId=${product.id}&limit=4`);
          setRecentlyAdded(recentRes.data || []);
        } catch (err) {
          console.error('Error fetching related pets:', err);
        }
      }
    };
    fetchRelatedPets();
  }, [product, id]);

  // Variant variables grouping
  const colorVariants = product?.variants?.filter(v => v.type.toLowerCase() === 'color') || [];
  const sizeVariants = product?.variants?.filter(v => v.type.toLowerCase() === 'size') || [];

  // Auto-select first variant on load
  useEffect(() => {
    if (product) {
      if (colorVariants.length > 0 && !selectedColor) {
        setSelectedColor(colorVariants[0].value);
      }
      if (sizeVariants.length > 0 && !selectedSize) {
        setSelectedSize(sizeVariants[0].value);
      }
      if (product.isPet && activeTab === 'shipping') {
        setActiveTab('desc');
      }
    }
  }, [product, colorVariants, sizeVariants, activeTab]);

  // Find active selected variants
  const activeColorVar = colorVariants.find(v => v.value.toLowerCase() === selectedColor.toLowerCase());
  const activeSizeVar = sizeVariants.find(v => v.value.toLowerCase() === selectedSize.toLowerCase());

  // Compute live price, stock, and SKU
  let activePrice = product ? product.price : 0;
  let activeOriginalPrice = product ? product.originalPrice : null;
  let activeSku = product ? product.sku : '';
  let activeStock = product ? (product.inventory?.quantity ?? product.stock ?? 0) : 0;

  if (activeColorVar) {
    if (activeColorVar.price !== null && activeColorVar.price !== undefined) {
      activePrice = activeColorVar.price;
    }
    if (activeColorVar.stock !== null && activeColorVar.stock !== undefined) {
      activeStock = activeColorVar.stock;
    }
    if (activeColorVar.sku) {
      activeSku = activeColorVar.sku;
    }
  }

  if (activeSizeVar) {
    if (activeSizeVar.price !== null && activeSizeVar.price !== undefined) {
      activePrice = activeSizeVar.price;
    }
    if (activeSizeVar.stock !== null && activeSizeVar.stock !== undefined) {
      activeStock = activeColorVar && activeColorVar.stock !== null
        ? Math.min(activeColorVar.stock, activeSizeVar.stock)
        : activeSizeVar.stock;
    }
    if (activeSizeVar.sku) {
      activeSku = activeSizeVar.sku;
    }
  }

  // Active Images
  const getActiveImages = () => {
    if (!product || !product.images || product.images.length === 0) {
      return [{ url: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&q=80&w=800' }];
    }
    if (selectedColor) {
      const colorLower = selectedColor.toLowerCase();
      const matched = product.images.filter(img => 
        img.url.toLowerCase().includes(colorLower) || 
        img.url.toLowerCase().includes(colorLower.replace(/ /g, '-'))
      );
      if (matched.length > 0) return matched;
    }
    return product.images;
  };

  const activeImages = getActiveImages();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6 text-center">
        <h2 className="text-3xl font-extrabold text-secondary mb-4">Product Not Found</h2>
        <p className="text-muted mb-8 max-w-md">The product you are looking for does not exist or has been removed.</p>
        <Link to="/shop">
          <PremiumButton variant="primary">Return to Shop</PremiumButton>
        </Link>
      </div>
    );
  }

  const catName = product.category?.name || 'Uncategorized';
  const safeIndex = activeImageIndex >= activeImages.length ? 0 : activeImageIndex;
  const currentImageUrl = activeImages && activeImages[safeIndex]
    ? getFullImageUrl(activeImages[safeIndex].url || activeImages[safeIndex])
    : (product.images && product.images[0] ? getFullImageUrl(product.images[0].url || product.images[0]) : 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&q=80&w=800');

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (activeStock <= 0) {
      toast.error('Selected variant is out of stock.');
      return;
    }

    const cartProduct = {
      id: product.id,
      name: product.name,
      price: activePrice,
      originalPrice: activeOriginalPrice,
      slug: product.name.toLowerCase().replace(/ /g, '-'),
      description: product.description,
      image360Urls: product.image360Urls || [],
      images: product.images || [],
      selectedColor,
      selectedSize,
      gst: product.gst
    };

    dispatch(addToCartAPI({ product: cartProduct, quantity: 1, selectedColor, selectedSize }));
    toast.success(`${product.name} (${selectedColor ? selectedColor + ' ' : ''}${selectedSize}) added to cart!`);
    setToastMessage(`${product.name} added to cart!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleWishlist = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    dispatch(toggleWishlistItem(product));
    toast.success(`${product.name} wishlist updated`);
    setToastMessage(`${product.name} wishlist updated`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    try {
      setSubmittingReview(true);
      const formData = new FormData();
      formData.append('productId', id);
      formData.append('rating', ratingInput);
      formData.append('comment', commentInput);
      if (titleInput.trim()) {
        formData.append('title', titleInput.trim());
      }
      for (let i = 0; i < filesInput.length; i++) {
        formData.append('images', filesInput[i]);
      }

      await axios.post(`${import.meta.env.VITE_API_URL}/reviews`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('pawmart_accessToken')}`
        },
        withCredentials: true
      });

      setToastMessage('Review submitted successfully!');
      setTimeout(() => setToastMessage(null), 3000);
      setCommentInput('');
      setTitleInput('');
      setFilesInput([]);
      setRatingInput(5);
      setIsReviewModalOpen(false);
      fetchReviews();
      checkEligibility();
      fetchProduct(); // to update ratingAverage
    } catch (err) {
      setToastMessage(err.response?.data?.message || 'Failed to submit review');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleWriteReviewClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!isEligible) {
      setShowEligibilityError(true);
      return;
    }
    setIsReviewModalOpen(true);
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('pawmart_accessToken')}` },
        withCredentials: true
      });
      setToastMessage('Review deleted successfully!');
      setTimeout(() => setToastMessage(null), 3000);
      fetchReviews();
      checkEligibility();
      fetchProduct(); // to update ratingAverage
    } catch (err) {
      setToastMessage(err.response?.data?.message || 'Failed to delete review');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const rotatingAngles = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <div className="bg-background min-h-screen pt-32 pb-32">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 bg-[#111827] text-white px-6 py-4 rounded-full shadow-float flex items-center gap-3 text-sm font-semibold tracking-wide"
          >
            <span>✨</span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/shop" className="w-10 h-10 rounded-full bg-surface flex items-center justify-center hover:bg-accent/20 transition-colors text-secondary">
            <ArrowLeft size={18} />
          </Link>
          <div className="text-xs font-bold text-muted uppercase tracking-widest flex gap-2">
            <Link to="/shop" className="text-primary hover:text-[#CC5200] transition-colors">Shop</Link> / 
            <span className="text-secondary">{product.category?.name || 'Uncategorized'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start relative">
          
          {/* Gallery Column */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-32">
            <GlassCard hoverEffect={false} className="!bg-surface border-transparent p-4 aspect-square select-none">
              {(!product?.isPet && view360) ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-zinc-900 rounded-[20px] text-white relative shadow-inner">
                  <span className="text-xs font-bold text-white/50 uppercase tracking-widest absolute top-8">360° Viewer</span>
                  <div className="relative w-64 h-64 rounded-full border border-white/10 flex items-center justify-center bg-zinc-950 overflow-hidden mt-8 shadow-2xl">
                    <img src={product.image} alt={product.name} className="object-cover w-full h-full mix-blend-screen" style={{ transform: `rotate(${rotatingAngles[frame360]}deg)` }} />
                  </div>
                  <div className="w-[70%] flex flex-col gap-3 mt-12">
                    <input type="range" min="0" max="7" value={frame360} onChange={(e) => setFrame360(parseInt(e.target.value, 10))} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white" />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                      <span>Front</span><span>Drag</span><span>Back</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  onTouchStart={(e) => { touchStartX.current = e.targetTouches[0].clientX; }}
                  onTouchMove={(e) => { touchEndX.current = e.targetTouches[0].clientX; }}
                  onTouchEnd={() => {
                    if (touchStartX.current - touchEndX.current > 50) {
                      setActiveImageIndex((prev) => (prev + 1) % activeImages.length);
                    }
                    if (touchStartX.current - touchEndX.current < -50) {
                      setActiveImageIndex((prev) => (prev - 1 + activeImages.length) % activeImages.length);
                    }
                  }}
                  className="w-full h-full rounded-[20px] overflow-hidden bg-surface relative group flex items-center justify-center"
                >
                  <img 
                    src={currentImageUrl} 
                    alt={product.name} 
                    onMouseMove={(e) => {
                      const { left, top, width, height } = e.target.getBoundingClientRect();
                      const x = ((e.clientX - left) / width) * 100;
                      const y = ((e.clientY - top) / height) * 100;
                      setZoomPos({ x, y });
                    }}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={() => setIsFullScreen(true)}
                    style={{
                      transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                      transform: isHovered ? 'scale(1.8)' : 'scale(1)',
                      transition: isHovered ? 'none' : 'transform 0.3s ease'
                    }}
                    className="max-w-full max-h-full object-contain cursor-zoom-in transition-transform duration-700 mix-blend-multiply" 
                  />

                  {/* Navigation Arrows */}
                  {activeImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex((prev) => (prev - 1 + activeImages.length) % activeImages.length);
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-secondary shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex((prev) => (prev + 1) % activeImages.length);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-secondary shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </GlassCard>

            {/* Thumbnail Strip */}
            {!view360 && activeImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto py-2 scrollbar-none justify-center">
                {activeImages.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-16 rounded-[12px] overflow-hidden border-2 shrink-0 bg-white shadow-sm transition-all ${
                      idx === safeIndex ? 'border-primary scale-105' : 'border-black/[0.07] hover:border-black/30'
                    }`}
                  >
                    <img src={getFullImageUrl(img.url || img)} className="w-full h-full object-cover mix-blend-multiply" alt="" />
                  </button>
                ))}
              </div>
            )}

            {!product?.isPet && (
               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setView360(false)} 
                    className={`flex-1 py-4 rounded-[20px] font-bold text-sm transition-all border ${!view360 ? 'bg-primary text-white border-primary shadow-md' : 'bg-surface text-secondary border-black/[0.07] hover:border-black/20'}`}
                  >
                    Standard View
                  </button>
                  <button 
                    onClick={() => setView360(true)} 
                    className={`flex-1 py-4 rounded-[20px] font-bold text-sm transition-all border flex items-center justify-center gap-2 ${view360 ? 'bg-primary text-white border-primary shadow-md' : 'bg-surface text-secondary border-black/[0.07] hover:border-black/20'}`}
                  >
                    <Play size={16} /> Interactive 360°
                  </button>
               </div>
             )}
          </div>

          {/* Info Column */}
          <div className="flex flex-col pt-4">
            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-muted mb-4">
              <Link to="/shop" className="hover:text-primary transition-colors">Shop</Link>
              <span>/</span>
              <span className="text-primary">{catName}</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-extrabold font-outfit text-secondary mb-4 leading-tight">
              {product.name}
            </h1>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full border border-black/[0.05]">
                <Star size={16} className="text-accent fill-accent" />
                <span className="font-bold text-secondary">{(product.ratingAverage || 0).toFixed(1)}</span>
              </div>
               <span className="text-sm font-medium text-muted underline cursor-pointer">{reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}</span>
               {activeSku && <span className="text-xs font-bold bg-surface border px-2.5 py-1 rounded-full text-muted">SKU: {activeSku}</span>}
            </div>

            {/* Price & Discounts */}
            <div className="flex flex-col mb-10">
              {product.isPet ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">Estimated Adoption Fee</span>
                  <div className="font-outfit text-4xl font-extrabold text-primary flex items-baseline gap-3">
                    {product.price > 0 ? formatCurrency(product.price) : 'Free (Adoption)'}
                  </div>
                  <span className="text-xs font-semibold text-muted max-w-md mt-1 leading-relaxed">
                    This fee is payable only at the adoption center after approval of your adoption application. No online payment is accepted.
                  </span>
                </div>
              ) : (
                <>
                  {activeOriginalPrice && activeOriginalPrice > activePrice && (
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl text-muted line-through font-medium">{formatCurrency(activeOriginalPrice)}</span>
                      <span className="bg-success/15 text-success text-xs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {Math.round(((activeOriginalPrice - activePrice) / activeOriginalPrice) * 100)}% Off
                      </span>
                    </div>
                  )}
                  <div className="font-outfit text-5xl font-extrabold text-primary flex items-baseline gap-3">
                    {formatCurrency(activePrice)}
                    {product.gst && <span className="text-xs font-bold text-muted uppercase tracking-wider">(Includes {product.gst}% GST)</span>}
                  </div>
                </>
              )}
            </div>

            <div className="h-px w-full bg-black/5 mb-10" />

            {/* Color Swatch Selector */}
            {colorVariants.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">
                    Color: <span className="text-secondary font-extrabold">{selectedColor || 'Select'}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {colorVariants.map((v) => {
                    const colorName = v.value.toLowerCase();
                    const isSelected = selectedColor === v.value;
                    const isOutOfStock = v.stock !== null && v.stock === 0;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          if (!isOutOfStock) {
                            setSelectedColor(v.value);
                            setActiveImageIndex(0);
                          }
                        }}
                        disabled={isOutOfStock}
                        className={`relative w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                          isSelected
                            ? 'border-primary scale-110 shadow-md ring-4 ring-primary/10'
                            : 'border-black/[0.07] hover:border-black/30'
                        } ${isOutOfStock ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={v.value + (isOutOfStock ? ' (Out of stock)' : '')}
                      >
                        <span
                          className="w-8 h-8 rounded-full shadow-inner"
                          style={{
                            backgroundColor: colorName,
                            backgroundImage: colorName === 'multi' ? 'linear-gradient(to right, red, orange, yellow, green, blue, violet)' : 'none',
                            border: '1px solid rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        {isOutOfStock && (
                          <span className="absolute inset-0 w-[2px] h-full bg-red-500 rotate-45 mx-auto" />
                        )}
                        {isSelected && (
                          <span className="absolute w-2.5 h-2.5 rounded-full bg-primary border-2 border-white" style={{ bottom: -2, right: -2 }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selector */}
            {sizeVariants.length > 0 && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">
                    Size: <span className="text-secondary font-extrabold">{selectedSize || 'Select'}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {sizeVariants.map((v) => {
                    const isSelected = selectedSize === v.value;
                    const isOutOfStock = v.stock !== null && v.stock === 0;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          if (!isOutOfStock) setSelectedSize(v.value);
                        }}
                        disabled={isOutOfStock}
                        className={`px-4 py-2.5 rounded-[12px] font-bold text-sm border-2 transition-all ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-surface border-black/[0.07] text-secondary hover:border-black/20'
                        } ${isOutOfStock ? 'opacity-40 cursor-not-allowed relative overflow-hidden' : 'cursor-pointer'}`}
                      >
                        {v.value}
                        {isOutOfStock && (
                          <span className="absolute inset-0 w-[2px] h-full bg-red-500 rotate-45 mx-auto opacity-30" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stock indicator */}
             <div className="mb-6 flex items-center gap-2">
               {product.isPet ? (
                 <>
                   <span className={`w-2.5 h-2.5 rounded-full ${(product.availability && product.status === 'ACTIVE') ? 'bg-success' : 'bg-error'}`} />
                   <span className="text-xs font-extrabold uppercase tracking-wider text-muted">
                     {(product.availability && product.status === 'ACTIVE') ? 'Available for Adoption' : 'Already Adopted'}
                   </span>
                 </>
               ) : (
                 <>
                   <span className={`w-2.5 h-2.5 rounded-full ${activeStock > 0 ? 'bg-success' : 'bg-error'}`} />
                   <span className="text-xs font-extrabold uppercase tracking-wider text-muted">
                     {activeStock > 0 ? `${activeStock} items available` : 'Out of stock'}
                   </span>
                 </>
               )}
             </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              {product.isPet && product.listingType === 'ADOPTION' ? (
                <PremiumButton 
                  variant="primary" 
                  onClick={() => {
                    if (!isAuthenticated) {
                      navigate('/login');
                      return;
                    }
                    setIsAdoptionModalOpen(true);
                  }}
                  className="flex-grow !py-5 !text-lg !rounded-[24px]"
                >
                  Adopt {product.name} (Schedule Meet)
                </PremiumButton>
              ) : (
                <PremiumButton 
                  variant="primary" 
                  onClick={handleAddToCart} 
                  disabled={activeStock <= 0}
                  className="flex-grow !py-5 !text-lg !rounded-[24px]"
                >
                  {activeStock <= 0 ? 'Out of Stock' : <><ShoppingBag size={20}/> Add to Cart</>}
                </PremiumButton>
              )}
              <button 
                onClick={handleToggleWishlist}
                className="h-[68px] px-8 rounded-[24px] border-2 border-black/[0.07] flex items-center justify-center text-secondary hover:border-error hover:text-error transition-all group"
              >
                <Heart size={24} className={wishlistItems.some(w => w.productId === product.id) ? "fill-error text-error" : "group-hover:fill-error/20"} />
              </button>
            </div>

            {!product.isPet && (
              <div className="grid grid-cols-2 gap-4 mb-12">
                 <div className="bg-surface p-4 rounded-[20px] border border-black/[0.07] flex items-start gap-3">
                   <Truck className="text-accent mt-0.5" size={20}/>
                   <div>
                     <h5 className="font-bold text-secondary text-sm">Fast Delivery</h5>
                     <p className="text-xs text-muted mt-1">Dispatched within 24h</p>
                   </div>
                 </div>
                 <div className="bg-surface p-4 rounded-[20px] border border-black/[0.07] flex items-start gap-3">
                   <RefreshCcw className="text-accent mt-0.5" size={20}/>
                   <div>
                     <h5 className="font-bold text-secondary text-sm">Free Returns</h5>
                     <p className="text-xs text-muted mt-1">30 days return policy</p>
                   </div>
                 </div>
                 <div className="col-span-2 bg-surface p-4 rounded-[20px] border border-black/[0.07] flex items-start gap-3">
                   <Shield className="text-accent mt-0.5" size={20}/>
                   <div>
                     <h5 className="font-bold text-secondary text-sm">Secure Checkout</h5>
                     <p className="text-xs text-muted mt-1">All transactions are secure and encrypted.</p>
                   </div>
                 </div>
              </div>
            )}

             {/* Tabs (Apple Style) */}
             <div className="flex gap-8 border-b border-black/5 mb-8 overflow-x-auto scrollbar-none">
               {(product?.isPet ? ['desc', 'specs', 'seller', 'reviews'] : ['desc', 'specs', 'shipping', 'seller', 'reviews']).map(tab => (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-primary' : 'text-muted hover:text-secondary'}`}
                 >
                   {tab === 'desc' ? 'Description' : tab === 'specs' ? 'Specifications' : tab === 'shipping' ? 'Shipping Info' : tab === 'seller' ? (product.isPet ? 'Adoption Center' : 'Store Profile') : `Reviews (${reviews.length})`}
                   {activeTab === tab && (
                     <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                   )}
                 </button>
               ))}
             </div>

             <div className="min-h-[160px]">
               <AnimatePresence mode="wait">
                 <motion.div
                   key={activeTab}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   transition={{ duration: 0.3 }}
                   className="text-muted leading-relaxed font-medium"
                 >
                   {activeTab === 'desc' && <p>{product.description}</p>}
                   {activeTab === 'specs' && (
                      product.isPet ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-surface p-4 rounded-xl border border-black/[0.03] flex flex-col">
                            <span className="text-[10px] text-muted uppercase font-extrabold tracking-wider">Breed</span>
                            <span className="text-secondary font-bold mt-1 text-sm">{product.breed || 'Mixed Breed'}</span>
                          </div>
                          <div className="bg-surface p-4 rounded-xl border border-black/[0.03] flex flex-col">
                            <span className="text-[10px] text-muted uppercase font-extrabold tracking-wider">Category</span>
                            <span className="text-secondary font-bold mt-1 text-sm">{product.category?.name || 'Uncategorized'}</span>
                          </div>
                          <div className="bg-surface p-4 rounded-xl border border-black/[0.03] flex flex-col">
                            <span className="text-[10px] text-muted uppercase font-extrabold tracking-wider">Age</span>
                            <span className="text-secondary font-bold mt-1 text-sm">{product.age || 'Puppy'}</span>
                          </div>
                          <div className="bg-surface p-4 rounded-xl border border-black/[0.03] flex flex-col">
                            <span className="text-[10px] text-muted uppercase font-extrabold tracking-wider">Gender</span>
                            <span className="text-secondary font-bold mt-1 text-sm">{product.gender || 'MALE'}</span>
                          </div>
                          <div className="bg-surface p-4 rounded-xl border border-black/[0.03] flex flex-col">
                            <span className="text-[10px] text-muted uppercase font-extrabold tracking-wider">Weight</span>
                            <span className="text-secondary font-bold mt-1 text-sm">{product.weight ? `${product.weight} kg` : 'N/A'}</span>
                          </div>
                          <div className="bg-surface p-4 rounded-xl border border-black/[0.03] flex flex-col">
                            <span className="text-[10px] text-muted uppercase font-extrabold tracking-wider">Color / Coat</span>
                            <span className="text-secondary font-bold mt-1 text-sm">{product.color || 'N/A'}</span>
                          </div>
                          <div className="bg-surface p-4 rounded-xl border border-black/[0.03] flex flex-col">
                            <span className="text-[10px] text-muted uppercase font-extrabold tracking-wider">Vaccination Status</span>
                            <span className="text-secondary font-bold mt-1 text-sm">{product.vaccinationStatus?.replace(/_/g, ' ') || 'Vetted'}</span>
                          </div>
                          <div className="bg-surface p-4 rounded-xl border border-black/[0.03] flex flex-col">
                            <span className="text-[10px] text-muted uppercase font-extrabold tracking-wider">Health Status</span>
                            <span className="text-secondary font-bold mt-1 text-sm">{product.healthStatus || 'Healthy'}</span>
                          </div>
                          <div className="bg-surface p-4 rounded-xl border border-black/[0.03] flex flex-col">
                            <span className="text-[10px] text-muted uppercase font-extrabold tracking-wider">Microchip Number</span>
                            <span className="text-secondary font-bold mt-1 text-sm">{product.microchipNumber || 'N/A'}</span>
                          </div>
                          <div className="bg-surface p-4 rounded-xl border border-black/[0.03] flex flex-col">
                            <span className="text-[10px] text-muted uppercase font-extrabold tracking-wider">Availability</span>
                            <span className={`font-bold mt-1 text-sm ${product.availability && product.status === 'ACTIVE' ? 'text-success' : 'text-error'}`}>
                              {product.availability && product.status === 'ACTIVE' ? 'Available for Adoption' : 'Adopted'}
                            </span>
                          </div>
                          {product.medicalHistory && (
                            <div className="col-span-2 md:col-span-3 bg-surface p-4 rounded-xl border border-black/[0.03] flex flex-col">
                              <span className="text-[10px] text-muted uppercase font-extrabold tracking-wider">Medical History</span>
                              <span className="text-secondary mt-1.5 text-xs font-medium leading-relaxed">{product.medicalHistory}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <ul className="flex flex-col gap-3">
                          <li className="flex justify-between border-b border-black/5 pb-2"><span className="text-secondary font-bold">Category</span><span>{product.category?.name?.toUpperCase() || 'UNCATEGORIZED'}</span></li>
                          <li className="flex justify-between border-b border-black/5 pb-2"><span className="text-secondary font-bold">Weight</span><span>1.2 kg</span></li>
                          <li className="flex justify-between border-b border-black/5 pb-2"><span className="text-secondary font-bold">Origin</span><span>India</span></li>
                        </ul>
                      )
                    )}
                   {activeTab === 'shipping' && <p>Ships from our centralized Karnataka warehouse. Free delivery within Karnataka on orders over ₹499. Orders are typically delivered within 2-4 days.</p>}
                   
                   {activeTab === 'seller' && (
                     product.isPet ? (
                       <div className="space-y-6">
                         {product.seller?.providerProfile?.storeBanner && (
                           <div className="w-full h-40 md:h-48 rounded-2xl overflow-hidden border border-black/5 shadow-sm">
                             <img 
                               src={getFullImageUrl(product.seller.providerProfile.storeBanner)} 
                               alt="Clinic Banner" 
                               className="w-full h-full object-cover" 
                             />
                           </div>
                         )}
                         
                         <div className="flex items-center gap-4">
                           {product.seller?.providerProfile?.storeLogo ? (
                             <img 
                               src={getFullImageUrl(product.seller.providerProfile.storeLogo)} 
                               alt="Clinic Logo" 
                               className="w-16 h-16 rounded-2xl object-cover border border-black/5 shadow-sm" 
                             />
                           ) : (
                             <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-outfit font-extrabold text-xl border border-black/5 shadow-sm">
                               {product.seller?.providerProfile?.businessName?.charAt(0) || 'A'}
                             </div>
                           )}
                           <div>
                             <h4 className="font-outfit font-extrabold text-lg text-secondary">{product.seller?.providerProfile?.businessName || product.seller?.providerProfile?.clinicName || 'Adoption Clinic'}</h4>
                             <p className="text-xs text-muted font-bold">Adoption Center & Care Clinic</p>
                           </div>
                         </div>

                         {product.seller?.providerProfile?.description && (
                           <p className="text-sm text-muted leading-relaxed font-medium mt-2">{product.seller.providerProfile.description}</p>
                         )}
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold mt-4 pt-4 border-t border-black/5">
                           <div className="flex items-center gap-2 text-muted">
                             <span className="text-secondary font-extrabold">Clinic/Center:</span>
                             <span className="text-secondary font-semibold">{product.seller?.providerProfile?.clinicName || 'N/A'}</span>
                           </div>
                           <div className="flex items-center gap-2 text-muted">
                             <span className="text-secondary font-extrabold">Address:</span>
                             <span className="text-secondary font-semibold">{product.seller?.providerProfile?.businessAddress || 'N/A'}</span>
                           </div>
                           {product.seller?.providerProfile?.city && (
                             <div className="flex items-center gap-2 text-muted">
                               <span className="text-secondary font-extrabold">City/State:</span>
                               <span className="text-secondary font-semibold">
                                 {product.seller.providerProfile.city}{product.seller.providerProfile.state ? `, ${product.seller.providerProfile.state}` : ''}
                               </span>
                             </div>
                           )}
                           {product.seller?.email && (
                             <div className="flex items-center gap-2 text-muted">
                               <span className="text-secondary font-extrabold">Email:</span>
                               <span className="text-secondary font-semibold">{product.seller.email}</span>
                             </div>
                           )}
                           {(product.seller?.providerProfile?.contactNumber || product.seller?.phone) && (
                             <div className="flex items-center gap-2 text-muted">
                               <span className="text-secondary font-extrabold">Phone:</span>
                               <span className="text-primary font-extrabold">
                                 {product.seller.providerProfile?.contactNumber || product.seller.phone}
                               </span>
                             </div>
                           )}
                           {product.seller?.providerProfile?.workingHours && (
                             <div className="flex items-center gap-2 text-muted">
                               <span className="text-secondary font-extrabold">Working Hours:</span>
                               <span className="text-secondary font-semibold">{product.seller.providerProfile.workingHours}</span>
                             </div>
                           )}
                           {product.seller?.providerProfile?.experience !== undefined && product.seller?.providerProfile?.experience !== null && (
                             <div className="flex items-center gap-2 text-muted">
                               <span className="text-secondary font-extrabold">Experience:</span>
                               <span className="text-secondary font-semibold">{product.seller.providerProfile.experience} Years</span>
                             </div>
                           )}
                           {product.seller?.providerProfile?.licenseNumber && (
                             <div className="flex items-center gap-2 text-muted">
                               <span className="text-secondary font-extrabold">License Number:</span>
                               <span className="text-secondary font-semibold">{product.seller.providerProfile.licenseNumber}</span>
                             </div>
                           )}
                         </div>
                         <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                           <p className="text-xs font-bold text-primary leading-relaxed">
                             <strong>Instructions:</strong> Please visit the adoption center on your scheduled date and time to complete the adoption process.
                           </p>
                         </div>
                       </div>
                     ) : (
                       <div className="space-y-6">
                         {product.seller?.storeProfile?.storeBanner && (
                           <div className="w-full h-40 md:h-48 rounded-2xl overflow-hidden border border-black/5 shadow-sm">
                             <img 
                               src={getFullImageUrl(product.seller.storeProfile.storeBanner)} 
                               alt="Store Banner" 
                               className="w-full h-full object-cover" 
                             />
                           </div>
                         )}
                         
                         <div className="flex items-center gap-4">
                           {product.seller?.storeProfile?.storeLogo ? (
                             <img 
                               src={getFullImageUrl(product.seller.storeProfile.storeLogo)} 
                               alt="Store Logo" 
                               className="w-16 h-16 rounded-2xl object-cover border border-black/5 shadow-sm" 
                             />
                           ) : (
                             <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-outfit font-extrabold text-xl border border-black/5 shadow-sm">
                               {product.seller?.storeProfile?.storeName?.charAt(0) || product.seller?.firstName?.charAt(0) || 'S'}
                             </div>
                           )}
                           <div>
                             <h4 className="font-outfit font-extrabold text-lg text-secondary">{product.seller?.storeProfile?.storeName || `${product.seller?.firstName}'s Store`}</h4>
                             <p className="text-xs text-muted font-bold">Seller: {product.seller?.firstName} {product.seller?.lastName}</p>
                           </div>
                         </div>

                         {product.seller?.storeProfile?.storeDescription && (
                           <p className="text-sm text-muted leading-relaxed font-medium mt-2">{product.seller.storeProfile.storeDescription}</p>
                         )}
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold mt-4 pt-4 border-t border-black/5">
                           {product.seller?.storeProfile?.contactNumber && (
                             <div className="flex items-center gap-2 text-muted">
                               <span className="text-secondary font-extrabold">Phone:</span>
                               <span className="text-primary font-extrabold">{product.seller.storeProfile.contactNumber}</span>
                             </div>
                           )}
                           {product.seller?.storeProfile?.website && (
                             <div className="flex items-center gap-2 text-muted">
                               <span className="text-secondary font-extrabold">Website:</span>
                               <a href={product.seller.storeProfile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{product.seller.storeProfile.website}</a>
                             </div>
                           )}
                           {product.seller?.storeProfile?.facebook && (
                             <div className="flex items-center gap-2 text-muted">
                               <span className="text-secondary font-extrabold">Facebook:</span>
                               <a href={product.seller.storeProfile.facebook} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{product.seller.storeProfile.facebook}</a>
                             </div>
                           )}
                          {product.seller?.storeProfile?.instagram && (
                             <div className="flex items-center gap-2 text-muted">
                               <span className="text-secondary font-extrabold">Instagram:</span>
                               <a href={product.seller.storeProfile.instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{product.seller.storeProfile.instagram}</a>
                             </div>
                           )}
                           {product.seller?.storeProfile?.linkedin && (
                             <div className="flex items-center gap-2 text-muted">
                               <span className="text-secondary font-extrabold">LinkedIn:</span>
                               <a href={product.seller.storeProfile.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{product.seller.storeProfile.linkedin}</a>
                             </div>
                           )}
                         </div>

                         {product.seller?.sellerBrands && product.seller.sellerBrands.length > 0 && (
                           <div className="mt-6 pt-6 border-t border-black/5">
                             <h5 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Brands We Sell</h5>
                             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                               {product.seller.sellerBrands.map(b => (
                                 <div key={b.id} className="bg-surface border border-black/5 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                                   <img src={getFullImageUrl(b.logoUrl)} alt={b.name} className="h-10 w-full object-contain mb-1" />
                                   <span className="text-[10px] font-bold text-secondary truncate w-full">{b.name}</span>
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}
                       </div>
                     )
                 )}
                   
                   {activeTab === 'reviews' && (
                     <div className="space-y-8">
                       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-black/5 pb-4 mb-6">
                         <div>
                           <h4 className="font-outfit font-extrabold text-lg text-secondary">Customer Reviews</h4>
                           <p className="text-xs text-muted font-bold mt-0.5">Share your feedback about this product</p>
                         </div>
                         <PremiumButton 
                           onClick={handleWriteReviewClick} 
                           variant="primary" 
                           className="!py-2 !px-4 text-xs font-bold"
                         >
                           Write a Review
                         </PremiumButton>
                       </div>

                       {/* List of Reviews */}
                       {loadingReviews ? (
                         <div className="text-center py-6 text-sm font-bold text-muted">Loading reviews...</div>
                       ) : reviews.length === 0 ? (
                         <div className="text-center py-8 text-sm font-bold text-muted bg-surface rounded-2xl border border-black/5">
                           No reviews yet.
                         </div>
                       ) : (
                         <div className="space-y-6">
                           {reviews.map((r) => (
                             <div key={r.id} className="p-5 bg-white rounded-2xl border border-black/5 flex flex-col gap-4 shadow-sm relative group">
                               {/* Delete Action (User owns review) */}
                               {isAuthenticated && user && r.userId === user.id && (
                                 <button
                                   onClick={() => handleDeleteReview(r.id)}
                                   className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                   title="Delete review"
                                 >
                                   <Trash size={16} />
                                 </button>
                               )}

                               <div className="flex items-center gap-3">
                                 {r.user?.avatarUrl ? (
                                   <img
                                     src={getFullImageUrl(r.user.avatarUrl)}
                                     alt=""
                                     className="w-10 h-10 rounded-full object-cover border border-black/5"
                                   />
                                 ) : (
                                   <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-outfit font-extrabold text-sm border border-black/5">
                                     {r.user?.firstName?.charAt(0) || 'U'}
                                   </div>
                                 )}
                                 <div>
                                   <h5 className="font-bold text-secondary text-sm">
                                     {r.user?.firstName} {r.user?.lastName}
                                   </h5>
                                   <div className="flex items-center gap-2 mt-0.5">
                                     <div className="flex">
                                       {[1, 2, 3, 4, 5].map((star) => (
                                         <Star
                                           key={star}
                                           size={12}
                                           className={star <= r.rating ? "text-accent fill-accent" : "text-gray-200"}
                                         />
                                       ))}
                                     </div>
                                     <span className="text-[10px] text-muted font-bold tracking-widest uppercase">
                                       {new Date(r.createdAt).toLocaleDateString()}
                                     </span>
                                   </div>
                                 </div>
                               </div>

                               <div className="flex items-center gap-1.5 text-xs text-green-600 font-bold bg-green-50 px-2.5 py-1 rounded-full w-fit">
                                 <Check size={12} /> Verified Purchase
                                </div>

                               {r.title && <h6 className="font-bold text-secondary text-sm mb-0">{r.title}</h6>}
                               <p className="text-secondary text-sm leading-relaxed">{r.comment}</p>

                               {/* Review Images */}
                               {r.images && r.images.length > 0 && (
                                 <div className="flex flex-wrap gap-2 mt-2">
                                   {r.images.map((img, idx) => (
                                     <img
                                       key={idx}
                                       src={getFullImageUrl(img)}
                                       alt=""
                                       className="w-20 h-20 object-cover rounded-xl border border-black/10 hover:scale-105 transition-transform duration-300"
                                     />
                                   ))}
                                 </div>
                               )}
                             </div>
                           ))}
                         </div>
                       )}
                     </div>
                   )}
                 </motion.div>
               </AnimatePresence>
             </div>

          </div>
        </div>
      </div>

      {/* Related Pets Section */}
      {product && product.isPet && (
        <div className="max-w-7xl mx-auto px-6 md:px-8 mt-24 border-t border-black/5 pt-16 flex flex-col gap-16 pb-16">
          {/* More from same center */}
          {moreFromCenter.length > 0 && (
            <div>
              <h3 className="text-2xl font-extrabold font-outfit text-secondary mb-8">More Pets from this Adoption Center</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {moreFromCenter.map(pet => (
                  <Link 
                    to={`/product/${pet.id}`} 
                    key={pet.id} 
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} 
                    className="group bg-white border border-black/[0.07] rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                      <img src={getFullImageUrl(pet.imageUrl)} alt={pet.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h4 className="font-extrabold text-secondary text-base group-hover:text-primary transition-colors">{pet.name}</h4>
                      <p className="text-xs text-muted font-bold mt-1 uppercase">{pet.breed}</p>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/5">
                        <span className="text-[10px] text-primary font-extrabold uppercase bg-primary/10 px-2.5 py-0.5 rounded-full">{pet.gender}</span>
                        <span className="text-[10px] text-muted font-bold">{pet.age}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Similar Breeds */}
          {similarBreeds.length > 0 && (
            <div>
              <h3 className="text-2xl font-extrabold font-outfit text-secondary mb-8">Similar Breeds</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {similarBreeds.map(pet => (
                  <Link 
                    to={`/product/${pet.id}`} 
                    key={pet.id} 
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} 
                    className="group bg-white border border-black/[0.07] rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                      <img src={getFullImageUrl(pet.imageUrl)} alt={pet.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h4 className="font-extrabold text-secondary text-base group-hover:text-primary transition-colors">{pet.name}</h4>
                      <p className="text-xs text-muted font-bold mt-1 uppercase">{pet.breed}</p>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/5">
                        <span className="text-[10px] text-primary font-extrabold uppercase bg-primary/10 px-2.5 py-0.5 rounded-full">{pet.gender}</span>
                        <span className="text-[10px] text-muted font-bold">{pet.age}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recently Added Pets */}
          {recentlyAdded.length > 0 && (
            <div>
              <h3 className="text-2xl font-extrabold font-outfit text-secondary mb-8">Recently Added Pets</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {recentlyAdded.map(pet => (
                  <Link 
                    to={`/product/${pet.id}`} 
                    key={pet.id} 
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} 
                    className="group bg-white border border-black/[0.07] rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                      <img src={getFullImageUrl(pet.imageUrl)} alt={pet.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h4 className="font-extrabold text-secondary text-base group-hover:text-primary transition-colors">{pet.name}</h4>
                      <p className="text-xs text-muted font-bold mt-1 uppercase">{pet.breed}</p>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/5">
                        <span className="text-[10px] text-primary font-extrabold uppercase bg-primary/10 px-2.5 py-0.5 rounded-full">{pet.gender}</span>
                        <span className="text-[10px] text-muted font-bold">{pet.age}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Submission Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full border border-black/5 shadow-2xl relative"
          >
            <button 
              onClick={() => setIsReviewModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-secondary transition-colors"
            >
              <X size={20} />
            </button>
            
            <h4 className="font-outfit font-extrabold text-2xl text-secondary mb-2">Write a Review</h4>
            <p className="text-sm font-semibold text-muted mb-6">Your review will help other buyers make better purchasing decisions.</p>
            
            <form onSubmit={handleSubmitReview} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Rating</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingInput(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        size={28}
                        className={star <= ratingInput ? "text-accent fill-accent" : "text-gray-300"}
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Review Title (Optional)</label>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="Summarize your review in a few words..."
                  className="w-full p-4 rounded-xl border border-black/10 focus:outline-none focus:border-primary text-sm font-semibold bg-white text-secondary placeholder:text-muted"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Your Review (Required)</label>
                <textarea
                  rows="3"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Describe what you liked or disliked about this product..."
                  className="w-full p-4 rounded-xl border border-black/10 focus:outline-none focus:border-primary text-sm font-semibold bg-white text-secondary placeholder:text-muted"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Upload Images (Max 5)</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setFilesInput(e.target.files)}
                  className="text-xs font-bold text-secondary cursor-pointer block w-full mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary file:cursor-pointer hover:file:bg-primary/20"
                />
              </div>
              
              <div className="flex gap-3 justify-end pt-4 border-t border-black/5">
                <PremiumButton
                  type="button"
                  variant="secondary"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="!py-2.5 !px-5 text-sm font-bold"
                >
                  Cancel
                </PremiumButton>
                <PremiumButton
                  type="submit"
                  variant="primary"
                  disabled={submittingReview}
                  className="!py-2.5 !px-5 text-sm font-bold"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </PremiumButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Eligibility Error Modal */}
      {showEligibilityError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-black/5 shadow-2xl relative text-center"
          >
            <button 
              onClick={() => setShowEligibilityError(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-secondary transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="w-16 h-16 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-5">
              <Shield size={32} />
            </div>
            
            <h4 className="font-outfit font-extrabold text-xl text-secondary mb-3">Review Verification</h4>
            <p className="text-sm font-semibold text-muted mb-6 leading-relaxed">
              Only verified buyers who have purchased and received this product from PawMart can submit reviews.
            </p>
            
            <PremiumButton
              onClick={() => setShowEligibilityError(false)}
              variant="primary"
              className="w-full !py-2.5 font-bold"
            >
              Got It
            </PremiumButton>
          </motion.div>
        </div>
      )}

      {/* Full Screen Image Modal */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFullScreen(false)}
            className="fixed inset-0 bg-black/95 z-[999] flex items-center justify-center p-4 backdrop-blur-md cursor-zoom-out select-none"
          >
            <button
              onClick={() => setIsFullScreen(false)}
              className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all"
            >
              <X size={24} />
            </button>
            <img
              src={currentImageUrl}
              alt={product.name}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            {activeImages.length > 1 && (
              <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-black/45 px-4 py-2.5 rounded-full border border-white/10">
                {activeImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex(idx);
                    }}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      idx === safeIndex ? 'bg-primary scale-125' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {isAdoptionModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-secondary/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] overflow-y-auto max-h-[85vh] max-w-lg w-full shadow-premium relative p-8 text-left custom-scrollbar"
            >
              <button onClick={() => setIsAdoptionModalOpen(false)} className="absolute top-6 right-6 p-2 bg-surface hover:bg-black/[0.07] rounded-full transition-colors text-secondary z-10">
                <X size={20} />
              </button>

              <form onSubmit={handleAdoptionSubmit} className="flex flex-col gap-6">
                <div className="mb-2">
                  <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-1">Adopt {product.name}</h2>
                  <p className="text-sm font-medium text-muted">Submit an adoption request for this pet.</p>
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
                    value={adoptionPhone} 
                    onChange={(e) => setAdoptionPhone(e.target.value)} 
                  />

                  <MinimalInput 
                    required 
                    type="date" 
                    label="Preferred Meeting Date" 
                    value={adoptionDate} 
                    onChange={(e) => setAdoptionDate(e.target.value)} 
                  />
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Preferred Meeting Time</label>
                    <select 
                      required
                      value={adoptionTime} 
                      onChange={(e) => setAdoptionTime(e.target.value)}
                      className="w-full h-14 px-5 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all"
                    >
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
                      value={adoptionReason} 
                      onChange={(e) => setAdoptionReason(e.target.value)} 
                      className="w-full p-4 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all resize-none text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Additional Notes (Optional)</label>
                    <textarea 
                      rows={2} 
                      placeholder="Any additional details or questions..."
                      value={adoptionNotes} 
                      onChange={(e) => setAdoptionNotes(e.target.value)} 
                      className="w-full p-4 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all resize-none text-sm"
                    />
                  </div>
                </div>

                <PremiumButton type="submit" disabled={isAdoptionSubmitting} variant="primary" className="w-full mt-4">
                  {isAdoptionSubmitting ? 'Requesting...' : 'Schedule Adoption Meeting'}
                </PremiumButton>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
