import React, { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../redux/cartSlice.js';
import { toggleWishlistItem, fetchWishlist } from '../redux/wishlistSlice.js';
import { ArrowRight, Star, Heart, ShoppingBag, ShieldCheck, Truck, Headphones, Search, Dog, Award, Shield, Sparkles } from 'lucide-react';
import axios from 'axios';
import { formatCurrency } from '../utils/formatCurrency.js';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';
import { getFullImageUrl } from '../utils/imageHelper.js';

const mockBrands = ['BarkBox', 'Purina', 'Kong', 'Chewy', 'Orijen', 'Ruffwear'];
const defaultCategories = [
  { name: 'Nutritious Food', icon: '🍲', count: '0 Products', slug: 'food', color: 'bg-emerald-50 text-emerald-700' },
  { name: 'Interactive Toys', icon: '🎾', count: '0 Products', slug: 'toys', color: 'bg-amber-50 text-amber-700' },
  { name: 'Cozy Beds', icon: '🛏️', count: '0 Products', slug: 'beds', color: 'bg-sky-50 text-sky-700' },
  { name: 'Pet Apparel', icon: '🧥', count: '0 Products', slug: 'apparel', color: 'bg-purple-50 text-purple-700' }
];

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};
const stagger = {
  visible: { transition: { staggerChildren: 0.1 } }
};

export default function LandingPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: wishlistItems } = useSelector(state => state.wishlist);
  const { isAuthenticated, user } = useSelector(state => state.auth || {});

  // Redirect authenticated non-buyers to their respective dashboards
  if (isAuthenticated && user) {
    if (user.role === 'SELLER') return <Navigate to="/seller/home" replace />;
    if (user.role === 'SERVICE_PROVIDER') return <Navigate to="/dashboard/provider" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/dashboard/admin" replace />;
  }

  const [categories, setCategories] = useState(defaultCategories);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [careServices, setCareServices] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const fetchLandingData = async () => {
      try {
        const [catRes, prodRes, srvRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/categories/counts`).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/search/products`),
          axios.get(`${import.meta.env.VITE_API_URL}/search/services`)
        ]);

        if (catRes.data && catRes.data.length > 0) {
          const updatedCats = defaultCategories.map(cat => {
            const match = catRes.data.find(c => c.slug === cat.slug);
            return { ...cat, count: match ? `${match._count.products} Products` : '0 Products' };
          });
          setCategories(updatedCats);
        }

        setFeaturedProducts(prodRes.data.slice(0, 4));
        setCareServices(srvRes.data.slice(0, 3));
      } catch (err) {
        console.error('Error fetching landing data:', err);
      }
    };
    fetchLandingData();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'BUYER') {
      dispatch(fetchWishlist());
    }
  }, [dispatch, isAuthenticated, user?.role]);

  const handleAddToCart = (prod, e) => {
    if (e) e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const product = {
      id: prod.id,
      name: prod.name,
      price: prod.price,
      slug: prod.name.toLowerCase().replace(/ /g, '-'),
      description: 'Premium pet product essential.',
      image360Urls: [],
      images: prod.images || [{ id: '1', url: prod.image }]
    };
    dispatch(addToCart({ product }));
    setToastMessage(`${prod.name} added to cart`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleWishlist = (prod, e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    dispatch(toggleWishlistItem(prod));
    setToastMessage(`${prod.name} wishlist updated`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="bg-background text-foreground overflow-hidden">
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

      {/* 1. Hero Section */}
      <section className="relative min-h-[95vh] flex items-center justify-center pt-24 pb-20 px-6 lg:px-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-[150px]"
          />
          <motion.div 
            animate={{ scale: [1, 1.1, 1], rotate: [0, -2, 2, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-[40%] -left-[10%] w-[600px] h-[600px] bg-gradient-to-tr from-sky-400/10 to-transparent rounded-full blur-[150px]"
          />
        </div>

        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center w-full z-10 relative">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-col gap-8">
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-glass border border-black/5 w-fit">
              <Award size={16} className="text-accent" />
              <span className="text-xs font-bold tracking-widest uppercase">The #1 Premium Pet Marketplace</span>
            </motion.div>
            
            <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl lg:text-[84px] font-outfit font-extrabold leading-[1.05] tracking-tight">
              Elevate your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">pet's lifestyle.</span>
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-muted leading-relaxed max-w-lg font-medium">
              Discover curated luxury products, verified veterinary care, and premium grooming services all in one beautifully designed platform.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-4 pt-4">
              <Link to="/shop">
                <PremiumButton variant="primary" className="!text-lg">Shop Collection <ArrowRight size={20}/></PremiumButton>
              </Link>
              <Link to="/services">
                <PremiumButton variant="ghost" className="!text-lg !bg-white shadow-glass">Book Services</PremiumButton>
              </Link>
            </motion.div>

          </motion.div>
          
          <motion.div initial={{ opacity: 0, scale: 0.9, rotate: -2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} className="relative h-[340px] sm:h-[480px] lg:h-[750px] w-full rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-float">
            <img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=1200" alt="Happy Dogs" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <GlassCard hoverEffect={false} className="absolute bottom-4 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-8 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 !bg-white/10 !border-white/20">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center shadow-lg shrink-0"><Shield className="text-success" size={20}/></div>
                <div>
                  <h4 className="text-white font-bold text-sm sm:text-lg">Verified Partners</h4>
                  <p className="text-white/80 text-xs sm:text-sm">100% vetted professionals</p>
                </div>
              </div>
              <PremiumButton variant="ghost" className="!bg-white !text-secondary !py-1.5 sm:!py-2 !px-3 sm:!px-4 !text-xs sm:!text-sm self-end sm:self-auto">Learn More</PremiumButton>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* 2. Trusted Brands */}
      <section className="py-16 bg-surface border-y border-black/[0.07]">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 text-center">
          <p className="text-xs font-bold tracking-widest text-muted uppercase mb-10">Curating the world's best pet brands</p>
          <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24 opacity-40 grayscale">
            {mockBrands.map((brand, i) => (
              <span key={i} className="text-xl md:text-2xl font-extrabold tracking-widest font-outfit text-secondary">
                {brand.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Shop by Category */}
      <section className="py-32 relative">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp} className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-6xl font-extrabold font-outfit tracking-tight mb-4">Explore our <br/>curated collections.</h2>
              <p className="text-lg text-muted font-medium">Everything your companion needs, categorised for your convenience.</p>
            </div>
            <Link to="/shop">
              <PremiumButton variant="secondary">View All Categories</PremiumButton>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } } }}>
                <Link to={`/shop?category=${cat.slug}`}>
                  <GlassCard className="p-8 h-full flex flex-col justify-between group !bg-white hover:!bg-surface border-transparent hover:border-black/[0.07] transition-all">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-12 ${cat.color} group-hover:scale-110 transition-transform duration-500`}>
                      {cat.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-secondary mb-1">{cat.name}</h3>
                      <p className="text-muted font-medium">{cat.count}</p>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Featured Products */}
      <section className="py-32 bg-[#111827] text-white rounded-[40px] md:rounded-[80px] mx-4 md:mx-8 mb-32 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[150px] pointer-events-none" />
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div>
              <span className="text-accent font-bold tracking-widest uppercase text-xs mb-4 block">Hand-picked Essentials</span>
              <h2 className="text-4xl md:text-5xl font-extrabold font-outfit tracking-tight">The Premium Edit.</h2>
            </div>
            <Link to="/shop">
              <PremiumButton variant="ghost" className="!bg-white/10 !text-white hover:!bg-white hover:!text-secondary">View Boutique</PremiumButton>
            </Link>
          </motion.div>

          {featuredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-[32px] border border-white/10">
              <ShoppingBag className="text-white/40 mb-4" size={48} />
              <h3 className="text-xl font-bold font-outfit text-white mb-2">No products available yet</h3>
              <p className="text-white/60 text-sm">Please check back later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map((prod, i) => {
                const imageUrl = (prod.images && prod.images.length > 0)
                   ? getFullImageUrl(prod.images[0].url)
                   : 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&q=80&w=800';
                const catName = prod.category?.name || 'Uncategorized';
                return (
                <motion.div key={prod.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.8 } } }}>
                  <Link to={`/product/${prod.id}`} className="group block h-full">
                    <GlassCard hoverEffect={false} className="!bg-white/5 !border-white/10 h-full flex flex-col p-4">
                      <div className="relative aspect-square rounded-[24px] overflow-hidden mb-6 bg-white/5">
                        <img src={imageUrl} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                        <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold tracking-wide">
                          {catName}
                        </div>
                        {isAuthenticated && user?.role === 'BUYER' && !(prod.inventory ? prod.inventory.quantity <= 0 : (prod.stock !== undefined ? prod.stock <= 0 : prod.status === 'OUT_OF_STOCK')) && (
                          <button 
                            onClick={(e) => { e.preventDefault(); handleAddToCart(prod, e); }}
                            className="absolute bottom-4 right-4 w-12 h-12 bg-white text-secondary hover:bg-primary hover:text-white rounded-full flex items-center justify-center shadow-float transition-all duration-300 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                          >
                            <ShoppingBag size={18} />
                          </button>
                        )}
                      </div>
                      <div className="px-2 pb-2">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xl font-extrabold text-white">{formatCurrency(prod.price)}</span>
                          <div className="flex items-center gap-1.5 text-accent text-sm font-bold">
                            <Star size={14} className="fill-accent"/> {(prod.ratingAverage || 0).toFixed(1)}
                          </div>
                        </div>
                        <h3 className="font-bold text-white/90 line-clamp-2 leading-tight group-hover:text-white transition-colors mb-2">{prod.name}</h3>
                        <div className={`flex items-center gap-2 text-xs font-semibold ${(prod.inventory ? prod.inventory.quantity <= 0 : (prod.stock !== undefined ? prod.stock <= 0 : prod.status === 'OUT_OF_STOCK')) ? 'text-red-400' : 'text-white/60'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${(prod.inventory ? prod.inventory.quantity <= 0 : (prod.stock !== undefined ? prod.stock <= 0 : prod.status === 'OUT_OF_STOCK')) ? 'bg-red-400' : 'bg-success'}`}></span>
                          {(prod.inventory ? prod.inventory.quantity <= 0 : (prod.stock !== undefined ? prod.stock <= 0 : prod.status === 'OUT_OF_STOCK')) ? 'Out of Stock' : 'In Stock'}
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              )})}
            </div>
          )}
        </div>
      </section>

      {/* 5. Services Section */}
      <section className="py-32 relative">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-6xl font-extrabold font-outfit tracking-tight mb-6">Expert care, delivered.</h2>
              <p className="text-xl text-muted font-medium leading-relaxed">Book trusted professionals for your pet's health, wellness, and happiness without leaving the platform.</p>
           </motion.div>

           {careServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-[32px] border border-black/[0.07]">
              <Sparkles className="text-muted mb-4" size={48} />
              <h3 className="text-xl font-bold font-outfit text-secondary mb-2">No services available yet</h3>
              <p className="text-muted text-sm">Please check back later.</p>
            </div>
           ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {careServices.map((srv, i) => {
                const srvImage = srv.imageUrl || 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=800';
                return (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } } }}>
                  <GlassCard className="p-1 h-full flex flex-col group border border-black/[0.07]">
                    <div className="h-48 rounded-[20px] overflow-hidden m-2 bg-surface relative">
                      <img src={srvImage} alt={srv.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm flex items-center gap-2 text-secondary">
                        <Sparkles size={14} /> {srv.category}
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-grow text-center items-center">
                      <h3 className="font-bold text-xl text-secondary mb-2">{srv.name}</h3>
                      <p className="text-muted text-sm leading-relaxed mb-6 flex-grow">{srv.description}</p>
                      <Link to="/services" className="flex items-center text-primary font-bold text-sm hover:text-secondary transition-colors group/link w-fit">
                        Explore Service
                        <ArrowRight size={16} className="ml-2 group-hover/link:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </GlassCard>
                </motion.div>
              )})}
            </div>
           )}
        </div>
      </section>
    </div>
  );
}
