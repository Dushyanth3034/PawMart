import React from 'react';
import { motion } from 'framer-motion';
import { Award, ShieldCheck, HeartHandshake, Sparkles } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard.jsx';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

export default function AboutPage() {
  return (
    <div className="bg-background min-h-screen pt-32 pb-32">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        
        {/* Hero Section */}
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="text-center max-w-4xl mx-auto mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface shadow-sm border border-black/[0.07] mb-8">
            <Sparkles size={16} className="text-primary" />
            <span className="text-xs font-bold tracking-widest uppercase text-muted">Our Story</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold font-outfit tracking-tight text-secondary leading-[1.1] mb-8">
            Elevating the standard of <span className="text-primary">pet care.</span>
          </h1>
          <p className="text-xl text-muted font-medium leading-relaxed">
            At PawMart, we believe every pet deserves the absolute best. We provide a premium marketplace linking loving pet owners with verified brands, organic foods, and licensed care specialists.
          </p>
        </motion.div>

        {/* Vision Image */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-[500px] rounded-[40px] overflow-hidden shadow-premium mb-24 relative"
        >
           <img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=1600" className="w-full h-full object-cover" alt="Happy pets" />
           <div className="absolute inset-0 bg-primary/10 mix-blend-multiply"></div>
        </motion.div>

        {/* Core Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: ShieldCheck, title: "Vetted Integrity", desc: "Every seller and provider on our platform undergoes a rigorous license validation process by our compliance audit team." },
            { icon: Award, title: "Premium Quality", desc: "We exclusively focus on premium, organic foods, orthopedic bedding, and top-tier clinical pet services for ultimate care." },
            { icon: HeartHandshake, title: "Rescue & Care", desc: "We partner with local shelters and rescue organizations to facilitate secure and loving foster home connections." }
          ].map((val, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}>
              <GlassCard hoverEffect={true} className="p-10 !bg-surface border border-black/[0.07] text-center h-full flex flex-col items-center">
                <div className="w-16 h-16 rounded-[20px] bg-primary text-white flex items-center justify-center mb-6 shadow-md">
                  <val.icon size={28} />
                </div>
                <h3 className="font-extrabold text-2xl text-secondary font-outfit mb-4">{val.title}</h3>
                <p className="text-muted leading-relaxed font-medium">
                  {val.desc}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}
