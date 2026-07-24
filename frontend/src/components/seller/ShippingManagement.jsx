import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Truck, Package, Clock } from 'lucide-react';
import GlassCard from '../ui/GlassCard.jsx';
import PremiumButton from '../ui/PremiumButton.jsx';

export default function ShippingManagement() {
  const { accessToken } = useSelector((state) => state.auth);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/seller/shipping`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setShipments(res.data.data || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-2">Shipping Management</h2>
        <p className="text-muted text-sm">Monitor tracking statuses and delivery timelines for your shipped orders.</p>
      </div>

      <div className="bg-white rounded-[24px] border border-black/[0.07] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-black/[0.07]">
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Order Item</th>
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Product</th>
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Tracking #</th>
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider text-right">Estimated Delivery</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-muted">Loading shipments...</td></tr>
              ) : shipments.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-muted font-medium">No active shipments found.</td></tr>
              ) : (
                shipments.map((item) => (
                  <tr key={item.id} className="border-b border-black/[0.03] hover:bg-black/[0.02]">
                    <td className="p-4 font-mono text-sm text-muted">{item.id.substring(0,8)}</td>
                    <td className="p-4 font-bold text-secondary">{item.product?.name}</td>
                    <td className="p-4 font-mono text-xs text-primary bg-primary/5 px-2 py-1 rounded inline-block mt-3">
                      {item.trackingNumber || 'Pending Courier'}
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider ${
                        item.status === 'SHIPPED' ? 'text-accent' : 
                        item.status === 'DELIVERED' ? 'text-success' : 'text-muted'
                      }`}>
                        {item.status === 'SHIPPED' ? <Truck size={14} /> : item.status === 'DELIVERED' ? <Package size={14} /> : <Clock size={14} />}
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-right text-sm font-medium text-secondary">
                      {item.estimatedDelivery ? new Date(item.estimatedDelivery).toLocaleDateString() : 'TBD'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
