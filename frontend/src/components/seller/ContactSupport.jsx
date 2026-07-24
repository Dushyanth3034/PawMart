import React from 'react';
import { LifeBuoy, MessageCircle, FileText, Send } from 'lucide-react';
import GlassCard from '../ui/GlassCard.jsx';
import PremiumButton from '../ui/PremiumButton.jsx';
import MinimalInput from '../ui/MinimalInput.jsx';

export default function ContactSupport() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-2">Contact Support</h2>
        <p className="text-muted text-sm">Need help? Reach out to the Paw-Mart Admin team or browse our FAQs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard hoverEffect className="p-6 border-black/[0.07] text-center cursor-pointer">
          <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <LifeBuoy size={24} />
          </div>
          <h3 className="font-bold text-secondary mb-1">Help Center</h3>
          <p className="text-xs text-muted">Read our guides</p>
        </GlassCard>

        <GlassCard hoverEffect className="p-6 border-black/[0.07] text-center cursor-pointer">
          <div className="w-12 h-12 mx-auto rounded-full bg-accent/20 text-accent flex items-center justify-center mb-4">
            <FileText size={24} />
          </div>
          <h3 className="font-bold text-secondary mb-1">FAQs</h3>
          <p className="text-xs text-muted">Common questions</p>
        </GlassCard>

        <GlassCard hoverEffect className="p-6 border-black/[0.07] text-center cursor-pointer">
          <div className="w-12 h-12 mx-auto rounded-full bg-success/10 text-success flex items-center justify-center mb-4">
            <MessageCircle size={24} />
          </div>
          <h3 className="font-bold text-secondary mb-1">Live Chat</h3>
          <p className="text-xs text-muted">Coming soon</p>
        </GlassCard>
      </div>

      <GlassCard className="p-8 border-black/[0.07]">
        <h3 className="text-xl font-bold text-secondary mb-6">Send a Message to Admin</h3>
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert("Message sent successfully!"); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MinimalInput label="Subject" placeholder="E.g. Issue with payout" required />
            <div className="flex flex-col">
              <label className="text-xs font-bold text-muted uppercase tracking-wider mb-2 ml-1">Priority</label>
              <select className="bg-surface border border-black/[0.07] rounded-[16px] h-[52px] px-4 font-medium text-secondary outline-none focus:border-primary/50 transition-colors">
                <option value="low">Low - General Inquiry</option>
                <option value="medium">Medium - Technical Issue</option>
                <option value="high">High - Urgent Account Issue</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wider mb-2 ml-1 block">Message</label>
            <textarea 
              className="w-full bg-surface border border-black/[0.07] rounded-[16px] p-4 text-secondary font-medium outline-none focus:border-primary/50 transition-colors resize-none"
              rows="5"
              placeholder="Describe your issue in detail..."
              required
            ></textarea>
          </div>
          <div className="flex justify-end">
            <PremiumButton type="submit" variant="primary" className="!px-8">
              <Send size={18} /> Send Message
            </PremiumButton>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
