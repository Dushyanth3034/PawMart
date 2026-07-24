import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { clearCredentials, fetchProfile, logoutUser } from '../../redux/authSlice.js';
import { fetchWishlist } from '../../redux/wishlistSlice.js';
import { fetchCart } from '../../redux/cartSlice.js';
import { Menu, X, ShoppingCart, PawPrint, Search, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumButton from './PremiumButton.jsx';
import SearchModal from './SearchModal.jsx';

export default function FloatingNavbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { totalQuantity } = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchProfile());
      if (user?.role === 'BUYER') {
        dispatch(fetchWishlist());
        dispatch(fetchCart());
      }
    }
  }, [isAuthenticated, user?.role, dispatch]);

  useEffect(() => { setIsOpen(false); setIsSearchOpen(false); }, [location]);

  const handleLogout = () => { dispatch(logoutUser()); navigate('/'); };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'ADMIN': return '/dashboard/admin';
      case 'SELLER': return '/seller/home';
      case 'SERVICE_PROVIDER': return '/dashboard/provider';
      default: return '/dashboard/buyer';
    }
  };

  const allNavLinks = [
    { name: 'Home', path: '/', hideFor: ['SELLER'] },
    { name: 'Shop', path: '/shop', roles: ['BUYER'] },
    { name: 'Categories', path: '/shop', roles: ['BUYER'] },
    { name: 'Services', path: '/services', roles: ['BUYER'] },
    { name: 'Adoption', path: '/adoption', roles: ['BUYER'] },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const navLinks = allNavLinks.filter(link => {
    if (user && link.hideFor && link.hideFor.includes(user.role)) return false;
    if (link.roles && user && !link.roles.includes(user.role)) return false;
    if (link.roles && !user) return false;
    return true;
  });

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-background/85 backdrop-blur-xl border-b border-black/[0.07] shadow-premium py-3' 
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-[1440px] mx-auto w-full px-6 lg:px-12">
        <div className="grid grid-cols-2 xl:grid-cols-3 items-center w-full">
          
          {/* Logo (Left) */}
          <div className="flex justify-start items-center">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center shadow-glass group-hover:bg-[#CC5200] transition-colors duration-300">
                <PawPrint size={18} className="text-white" />
              </div>
              <span className="font-outfit font-extrabold text-xl text-secondary tracking-tight">
                Paw<span className="text-primary">Mart</span>
              </span>
            </Link>
          </div>

          {/* Desktop Links (Center) */}
          <div className="hidden xl:flex justify-center items-center">
            <div className="flex items-center gap-0.5 bg-surface/80 backdrop-blur-md px-1.5 py-1.5 rounded-full border border-black/[0.07]">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              to={link.path} 
              className={`px-3 py-1.5 rounded-full text-[13px] font-bold tracking-wide transition-all duration-200 ${
                location.pathname === link.path 
                  ? 'bg-primary text-white shadow-glass' 
                  : 'text-muted hover:text-secondary hover:bg-white/70'
              }`}
            >
              {link.name}
            </Link>
          ))}
            </div>
          </div>

          {/* Actions & Mobile Menu (Right) */}
          <div className="flex justify-end items-center gap-2 lg:gap-3">
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-1.5 lg:gap-3">
          {isAuthenticated && user?.role === 'BUYER' && (
            <button onClick={() => setIsSearchOpen(true)} className="relative p-2 text-muted hover:text-secondary hover:bg-surface rounded-full transition-all duration-200">
              <Search size={18} />
            </button>
          )}
          
          {isAuthenticated && user?.role === 'BUYER' && (
            <Link to="/cart" className="relative p-2 text-muted hover:text-secondary hover:bg-surface rounded-full transition-all duration-200">
              <ShoppingCart size={18} />
              {totalQuantity > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-background shadow-sm">
                  {totalQuantity}
                </span>
              )}
            </Link>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-2 ml-1">
              {user?.avatarUrl ? (
                <div className="w-9 h-9 rounded-full bg-surface border-2 border-white shadow-sm overflow-hidden mr-2">
                  <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-outfit font-extrabold text-sm mr-2 shadow-sm border-2 border-white">
                  {user?.firstName?.charAt(0) || 'U'}
                </div>
              )}
              <Link to={getDashboardLink()}>
                <PremiumButton variant="ghost" className="!py-2 !px-4 !text-sm">Dashboard</PremiumButton>
              </Link>
              <PremiumButton onClick={handleLogout} variant="secondary" className="!py-2 !px-4 !text-sm">Logout</PremiumButton>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-1">
              <Link to="/login">
                <PremiumButton variant="ghost" className="!py-2 !px-4 !text-sm">Log in</PremiumButton>
              </Link>
              <Link to="/register">
                <PremiumButton variant="primary" className="!py-2 !px-5 !text-sm">Sign up</PremiumButton>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 xl:hidden">
          {isAuthenticated && user?.role === 'BUYER' && (
            <Link to="/cart" className="relative p-2 text-muted hover:text-secondary md:hidden">
              <ShoppingCart size={20} />
              {totalQuantity > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white font-bold text-[9px] rounded-full flex items-center justify-center border border-background">
                  {totalQuantity}
                </span>
              )}
            </Link>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-secondary hover:bg-surface rounded-full transition-all duration-200"
          >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="xl:hidden mt-4 pt-4 border-t border-black/[0.07] flex flex-col gap-1 overflow-hidden px-4 pb-4 bg-background/95 backdrop-blur-xl rounded-[24px] shadow-lg border border-black/[0.05]"
          >
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
                  location.pathname.startsWith(link.path)
                    ? 'bg-primary/10 text-primary'
                    : 'text-secondary hover:bg-surface'
                }`}
              >
                {link.name}
              </Link>
            ))}
            
            <div className="h-px bg-black/[0.07] my-2" />
            
            <div className="flex flex-col gap-2 pb-2">
              {isAuthenticated ? (
                <div className="flex flex-col gap-2 pb-2">
                  <div className="flex items-center gap-3 px-4 py-2 border-b border-black/[0.07] mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-outfit font-extrabold text-sm shadow-sm border-2 border-white shrink-0">
                      {user?.firstName?.charAt(0) || 'U'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-secondary text-sm truncate">{user?.firstName} {user?.lastName}</span>
                      <span className="text-xs text-muted font-medium">{user?.role}</span>
                    </div>
                  </div>
                  <Link to={getDashboardLink()} onClick={() => setIsOpen(false)} className="w-full">
                    <PremiumButton variant="secondary" className="w-full justify-center">Dashboard</PremiumButton>
                  </Link>
                  <PremiumButton onClick={() => { setIsOpen(false); handleLogout(); }} variant="ghost" className="w-full justify-center">Logout</PremiumButton>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pb-2">
                  <Link to="/register" onClick={() => setIsOpen(false)} className="w-full">
                    <PremiumButton variant="primary" className="w-full justify-center">Create Account</PremiumButton>
                  </Link>
                  <Link to="/login" onClick={() => setIsOpen(false)} className="w-full">
                    <PremiumButton variant="secondary" className="w-full justify-center">Log in</PremiumButton>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </motion.nav>
  );
}
