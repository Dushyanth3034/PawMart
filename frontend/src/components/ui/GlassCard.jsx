import React from 'react';
import { motion } from 'framer-motion';

/**
 * GlassCard — warm surface card with soft orange-tinted shadow.
 * Used as the universal card container across all pages.
 */
export default function GlassCard({ children, className = '', hoverEffect = true, ...props }) {
  return (
    <motion.div
      whileHover={hoverEffect ? { y: -4, boxShadow: '0 20px 48px -12px rgba(230,92,0,0.18)' } : {}}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`bg-surface border border-black/[0.07] shadow-card rounded-[24px] overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
