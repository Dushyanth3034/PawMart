import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../redux/cartSlice.js';
import { toggleWishlistItem, fetchWishlist } from '../redux/wishlistSlice.js';
import { Search, SlidersHorizontal, X, Star, ShoppingBag, ArrowRight, Heart } from 'lucide-react';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';
import MinimalInput from '../components/ui/MinimalInput.jsx';
import axios from 'axios';
import { formatCurrency } from '../utils/formatCurrency.js';
import { getFullImageUrl } from '../utils/imageHelper.js';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

export default function ShopPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: wishlistItems } = useSelector(state => state.wishlist);
  const { isAuthenticated, user } = useSelector(state => state.auth);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState('popular');
  const [toastMessage, setToastMessage] = useState(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    setCategory(searchParams.get('category') || 'all');
  }, [searchParams]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/categories`);
        setCategories(res.data.data || []);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const url = category === 'all'
          ? `${import.meta.env.VITE_API_URL}/search/products`
          : `${import.meta.env.VITE_API_URL}/search/products?category=${category}`;
        const response = await axios.get(url);
        setProducts(response.data || []);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [category]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'BUYER') {
      dispatch(fetchWishlist());
    }
  }, [isAuthenticated, user?.role, dispatch]);

  const handleCategoryChange = (catId) => {
    setCategory(catId);
    setSearchParams(catId === 'all' ? {} : { category: catId });
  };

  const sortedProducts = [...products]
    .filter(p => search === '' || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'low-high') return a.price - b.price;
      if (sortBy === 'high-low') return b.price - a.price;
      return (b.ratingAverage || 0) - (a.ratingAverage || 0);
    });

  const handleToggleWishlist = async (product, e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    await dispatch(toggleWishlistItem(product));
    showToast('Wishlist updated');
  };

  const handleAddToCart = async (product, e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    await dispatch(addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      images: product.images || []
    }));
    
    showToast(`${product.name} added to cart`);
  };

  const catOptions = [
    { id: 'all', label: 'All Products' },
    { id: 'pets-for-sale', label: 'Pets for Sale 🐾' },
    ...categories.map(c => ({ id: c.name.toLowerCase(), label: c.name }))
  ];

  return (
    <div className="bg-background min-h-screen pt-32 pb-24">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 bg-primary text-white px-6 py-4 rounded-full shadow-float flex items-center gap-3 text-sm font-semibold tracking-wide"
          >
            <span>🛍️</span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold font-outfit tracking-tight text-secondary">The Collection.</h1>
            <p className="text-muted mt-2 font-medium max-w-md">Curated, high-quality essentials designed to elevate your companion's life.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-surface p-3 rounded-[20px] shadow-sm border border-black/[0.07] w-full md:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input 
                type="text" 
                placeholder="Search products..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 pr-4 py-3 bg-background border border-black/[0.07] rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none w-full sm:w-[200px] md:w-[260px] transition-all"
              />
            </div>
            <div className="hidden sm:block h-8 w-px bg-black/10"></div>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-background sm:bg-transparent border border-black/[0.07] sm:border-none p-3 sm:p-0 rounded-xl text-sm font-bold text-secondary focus:ring-0 outline-none cursor-pointer pr-4"
            >
              <option value="popular">Most Popular</option>
              <option value="low-high">Price: Low to High</option>
              <option value="high-low">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <aside className="lg:w-64 flex-shrink-0">
            <div className="lg:sticky lg:top-32 flex flex-col gap-4 lg:gap-8">
              <div>
                <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3 lg:mb-4">Categories</h3>
                <div className="flex flex-row overflow-x-auto lg:flex-col gap-2 scrollbar-none pb-2 lg:pb-0">
                  {catOptions.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryChange(cat.id)}
                      className={`text-left px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 lg:shrink transition-all ${
                        category === cat.id 
                          ? 'bg-primary text-white shadow-md' 
                          : 'bg-surface text-muted hover:bg-primary/10 hover:text-primary'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-grow">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[32px] border border-black/[0.07] shadow-sm">
                <h3 className="text-xl font-bold text-secondary mb-2">No products available yet.</h3>
                <p className="text-muted text-sm max-w-md mx-auto">
                  Please check back later as our sellers frequently list new items.
                </p>
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-[32px] border border-black/[0.07]">
                <Search className="text-muted mb-4" size={48} />
                <h3 className="text-xl font-bold font-outfit text-secondary mb-2">No products found</h3>
                <p className="text-muted text-sm">Try adjusting your search or category filters.</p>
                <PremiumButton variant="secondary" onClick={() => { setSearch(''); handleCategoryChange('all'); }} className="mt-6">
                  Clear Filters
                </PremiumButton>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedProducts.map((prod, i) => {
                  const imageUrl = (prod.images && prod.images.length > 0)
                    ? getFullImageUrl(prod.images[0].url)
                    : 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&q=80&w=600';
                  const catName = prod.category?.name || 'Uncategorized';
                  return (
                  <motion.div key={prod.id} initial="hidden" animate="visible" variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.5 } } }}>
                    <Link to={`/product/${prod.id}`} className="group block h-full">
                      <GlassCard hoverEffect={true} className="!bg-surface border-transparent h-full flex flex-col p-4 transition-all">
                        <div className="relative aspect-square rounded-[20px] overflow-hidden mb-5 bg-surface">
                          <img src={imageUrl} alt={prod.name} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-700 ease-out" />
                          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm">
                            {catName}
                          </div>
                          
                          <button
                            onClick={(e) => handleToggleWishlist(prod, e)}
                            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md hover:bg-white text-error rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-110 z-10"
                          >
                            <Heart size={16} className={wishlistItems.some(w => w.productId === prod.id) ? "fill-error text-error" : "text-error"} />
                          </button>

                          {!(prod.status === 'OUT_OF_STOCK' || prod.inventory?.quantity === 0 || prod.stock === 0) && (
                            <button 
                              onClick={(e) => handleAddToCart(prod, e)}
                              className="absolute bottom-4 right-4 w-12 h-12 bg-primary hover:bg-[#CC5200] text-white rounded-full flex items-center justify-center shadow-float transition-all duration-300 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                            >
                              <ShoppingBag size={18} />
                            </button>
                          )}
                        </div>
                        <div className="px-2 pb-2 flex flex-col flex-grow">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xl font-extrabold text-secondary">{formatCurrency(prod.price)}</span>
                            <div className="flex items-center text-xs font-bold text-secondary bg-white px-2 py-1 rounded-full border border-black/[0.05]">
                              <Star size={12} className="text-accent fill-accent mr-1" />
                              {(prod.ratingAverage || 0).toFixed(1)}
                            </div>
                          </div>
                          <h3 className="font-bold text-secondary line-clamp-2 leading-tight flex-grow mb-4 group-hover:text-primary transition-colors">{prod.name}</h3>
                          
                          <div className={`flex items-center gap-2 text-xs font-semibold ${prod.status === 'OUT_OF_STOCK' || prod.inventory?.quantity === 0 || prod.stock === 0 ? 'text-red-500' : 'text-muted/80'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${prod.status === 'OUT_OF_STOCK' || prod.inventory?.quantity === 0 || prod.stock === 0 ? 'bg-red-500' : 'bg-success'}`}></span>
                            {prod.status === 'OUT_OF_STOCK' || prod.inventory?.quantity === 0 || prod.stock === 0 ? 'Out of Stock' : 'In Stock'}
                          </div>
                        </div>
                      </GlassCard>
                    </Link>
                  </motion.div>
                )})}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
