import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';
import MinimalInput from '../components/ui/MinimalInput.jsx';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && email && message) {
      setIsSending(true);
      setTimeout(() => {
        setIsSending(false);
        setIsSent(true);
        setName('');
        setEmail('');
        setMessage('');
        setTimeout(() => setIsSent(false), 5000);
      }, 1500);
    }
  };

  return (
    <div className="bg-background min-h-screen pt-32 pb-32">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-20">
          <div>
            <h1 className="text-4xl md:text-6xl font-extrabold font-outfit tracking-tight text-secondary">Get in touch.</h1>
            <p className="text-muted font-medium text-lg max-w-xl mt-4 leading-relaxed">Have a question about order tracking, vendor verification, or pet bookings? Our premium support team is here to help.</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Info sidebar (Apple Style Dark Card) */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <GlassCard hoverEffect={false} className="!bg-[#111827] text-white p-10 h-full flex flex-col justify-between border-transparent relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[100px] pointer-events-none"></div>
              
              <div>
                <div className="w-16 h-16 rounded-[20px] bg-white/10 flex items-center justify-center mb-8 border border-white/10">
                  <MessageSquare size={28} className="text-accent" />
                </div>
                <h3 className="text-3xl font-extrabold font-outfit mb-8">Contact Information</h3>
                
                <div className="flex flex-col gap-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Phone size={16} className="text-white" />
                    </div>
                    <span className="font-medium text-white/90 text-sm">+1 (555) 234-5678</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Mail size={16} className="text-white" />
                    </div>
                    <span className="font-medium text-white/90 text-sm">support@pawmart.com</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <MapPin size={16} className="text-white" />
                    </div>
                    <span className="font-medium text-white/90 text-sm leading-snug">742 Evergreen Terrace,<br/>Springfield, USA</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 mt-12 border-t border-white/10">
                <h4 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Support Hours</h4>
                <p className="text-sm text-white/80 font-medium">9 AM - 6 PM EST (Mon to Fri)</p>
              </div>
            </GlassCard>
          </motion.div>

          {/* Contact Form */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="lg:col-span-2">
            <GlassCard hoverEffect={false} className="p-10 !bg-surface border-transparent">
              <h3 className="text-2xl font-extrabold font-outfit text-secondary mb-8">Send a Message</h3>
              
              <AnimatePresence>
                {isSent && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, mb: 0 }}
                    animate={{ opacity: 1, height: 'auto', mb: 32 }}
                    exit={{ opacity: 0, height: 0, mb: 0 }}
                    className="bg-success/10 border border-success/20 text-success rounded-[16px] p-4 text-sm font-bold overflow-hidden"
                  >
                    ✓ Message sent successfully! Our team will contact you shortly.
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <MinimalInput required label="Your Name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
                  <MinimalInput required type="email" label="Email Address" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted uppercase tracking-wider">Message Description</label>
                  <textarea
                    required
                    rows={6}
                    placeholder="How can we help your pet today?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full p-5 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all resize-none"
                  ></textarea>
                </div>

                <PremiumButton type="submit" disabled={isSending} variant="primary" className="w-full mt-4 flex items-center justify-center gap-2">
                  {isSending ? 'Sending...' : <>Send Message <Send size={18}/></>}
                </PremiumButton>
              </form>
            </GlassCard>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
