import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Tag, Plus, Scissors } from 'lucide-react';
import PremiumButton from '../ui/PremiumButton.jsx';
import GlassCard from '../ui/GlassCard.jsx';

export default function Coupons() {
  const { accessToken } = useSelector((state) => state.auth);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/seller/coupons`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setCoupons(res.data.data || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-2">Coupons & Discounts</h2>
          <p className="text-muted text-sm">Create and manage discount codes for your customers.</p>
        </div>
        <PremiumButton variant="primary" className="!px-6"><Plus size={18} /> Create Coupon</PremiumButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="text-muted col-span-full">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="bg-white p-8 rounded-[24px] text-center text-muted font-medium border border-black/[0.07] col-span-full">
            No coupons created yet.
          </div>
        ) : (
          coupons.map(coupon => (
            <GlassCard key={coupon.id} className="p-6 border-black/[0.07] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-lg font-bold font-mono text-sm border border-primary/20">
                    <Scissors size={14} />
                    {coupon.code}
                  </div>
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider ${coupon.active ? 'bg-success/10 text-success' : 'bg-black/5 text-muted'}`}>
                    {coupon.active ? 'Active' : 'Expired'}
                  </span>
                </div>
                <h3 className="text-3xl font-extrabold text-secondary mb-1">
                  {coupon.isPercent ? `${coupon.discount}%` : `$${coupon.discount}`} OFF
                </h3>
                <p className="text-sm text-muted">Used {coupon.usageCount} times</p>
              </div>
              <div className="mt-6 pt-4 border-t border-black/[0.03] text-xs font-bold text-muted flex justify-between">
                <span>Expires: {new Date(coupon.expiresAt).toLocaleDateString()}</span>
                <button className="text-primary hover:underline">Edit</button>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}
