import React from 'react';
import { motion } from 'framer-motion';

/**
 * PremiumButton — warm orange design system
 * variants: primary | secondary | ghost | accent | danger
 */
export default function PremiumButton({ children, variant = 'primary', className = '', ...props }) {
  const base = "font-outfit font-bold rounded-full py-3.5 px-7 transition-all duration-200 flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary cursor-pointer select-none btn-ripple";

  const variants = {
    primary:   "bg-primary text-white hover:bg-[#CC5200] active:bg-[#A34100] shadow-glass focus-visible:ring-primary",
    secondary: "bg-transparent text-primary border-2 border-primary hover:bg-warm-100 active:bg-warm-200 focus-visible:ring-primary",
    accent:    "bg-accent text-secondary hover:bg-[#FFA266] active:bg-[#FF8C4D] shadow-glass focus-visible:ring-accent",
    ghost:     "bg-transparent text-secondary hover:bg-surface active:bg-surface/80 border border-black/10 focus-visible:ring-gray-300",
    danger:    "bg-error text-white hover:bg-red-600 active:bg-red-700 shadow-glass focus-visible:ring-error",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      className={`${base} ${variants[variant] ?? variants.primary} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
