import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { motion } from 'framer-motion';

export default function NotFoundPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-background">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg"
      >
        <GlassCard hoverEffect={false} className="p-10 flex flex-col items-center text-center shadow-sm border border-black/[0.07] bg-white">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-[24px] flex items-center justify-center mb-8 shadow-inner border border-primary/20">
            <ShieldAlert size={36} />
          </div>
          
          <h1 className="text-4xl font-extrabold font-outfit text-secondary mb-3 tracking-tight">Page Not Found</h1>
          <p className="text-muted font-medium max-w-sm mb-10 leading-relaxed">
            The page you are looking for does not exist, has been archived, or was moved to another directory.
          </p>
          
          <Link to="/" className="w-full sm:w-auto">
            <PremiumButton variant="primary" className="w-full flex items-center justify-center gap-2">
              <ArrowLeft size={18} /> Return Home
            </PremiumButton>
          </Link>
        </GlassCard>
      </motion.div>
    </div>
  );
}
