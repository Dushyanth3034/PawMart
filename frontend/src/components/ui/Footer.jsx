import React from 'react';
import { Link } from 'react-router-dom';
import { PawPrint, Facebook, Instagram, Twitter, Heart } from 'lucide-react';
import PremiumButton from './PremiumButton.jsx';

import { useSelector } from 'react-redux';

export default function Footer() {
  const { user } = useSelector(state => state.auth || {});
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#111827] text-gray-400 pt-24 pb-10 overflow-hidden relative w-full">
      {/* Warm orange ambient glow */}
      <div className="absolute top-0 left-1/4 w-[600px] max-w-full h-[400px] bg-primary/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] max-w-full h-[300px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 pb-14 border-b border-white/[0.06]">

          {/* Brand Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Link to="/" className="flex items-center gap-2.5 group w-fit">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center group-hover:bg-[#CC5200] transition-colors duration-300 shadow-orange-glow">
                <PawPrint size={20} className="text-white" />
              </div>
              <span className="font-outfit font-extrabold text-2xl text-white tracking-tight">
                Paw<span className="text-primary">Mart</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-gray-500 max-w-sm">
              The premier marketplace connecting pet owners with trusted products and expert pet care service providers.
            </p>
            <div className="flex gap-3 mt-1">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-primary/20 hover:text-primary rounded-full text-gray-500 transition-all duration-300">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          {user?.role !== 'SELLER' && user?.role !== 'SERVICE_PROVIDER' && (
            <div className="flex flex-col gap-5">
              <h4 className="text-[11px] font-bold text-white uppercase tracking-widest">Shop</h4>
              <ul className="flex flex-col gap-3.5 text-sm font-medium">
                {[['Nutritious Food', '/shop?category=food'], ['Interactive Toys', '/shop?category=toys'], ['Beds & Furniture', '/shop?category=beds'], ['Grooming Products', '/shop?category=grooming']].map(([label, href]) => (
                  <li key={label}><Link to={href} className="text-gray-500 hover:text-primary transition-colors duration-200">{label}</Link></li>
                ))}
              </ul>
            </div>
          )}

          {/* Services */}
          {user?.role !== 'SELLER' && user?.role !== 'SERVICE_PROVIDER' && (
            <div className="flex flex-col gap-5">
              <h4 className="text-[11px] font-bold text-white uppercase tracking-widest">Services</h4>
              <ul className="flex flex-col gap-3.5 text-sm font-medium">
                {[['Veterinary Care', '/services?type=vet'], ['Pet Grooming', '/services?type=grooming'], ['Luxury Boarding', '/services?type=boarding'], ['Pet Adoption', '/adoption'], ['Contact Us', '/contact']].map(([label, href]) => (
                  <li key={label}><Link to={href} className="text-gray-500 hover:text-primary transition-colors duration-200">{label}</Link></li>
                ))}
              </ul>
            </div>
          )}

          {/* Newsletter */}
          {user?.role !== 'SELLER' && user?.role !== 'SERVICE_PROVIDER' && (
            <div className="flex flex-col gap-5">
              <h4 className="text-[11px] font-bold text-white uppercase tracking-widest">Newsletter</h4>
              <p className="text-sm text-gray-500 leading-relaxed">Exclusive launches and expert pet care tips.</p>
              <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="bg-white/[0.06] border border-white/[0.08] rounded-[14px] px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all duration-200"
                />
                <PremiumButton type="submit" variant="primary" className="w-full justify-center !text-sm">
                  Subscribe
                </PremiumButton>
              </form>
            </div>
          )}
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 text-xs font-medium text-gray-600">
          <p>© {currentYear} PawMart Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
          <p className="flex items-center gap-1.5">
            Designed with <Heart size={12} className="text-primary fill-primary" /> for pets.
          </p>
        </div>
      </div>
    </footer>
  );
}
