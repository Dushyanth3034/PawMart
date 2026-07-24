import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { RefreshCcw, CheckCircle, XCircle } from 'lucide-react';
import GlassCard from '../ui/GlassCard.jsx';
import PremiumButton from '../ui/PremiumButton.jsx';

export default function ReturnsRefunds() {
  const { accessToken } = useSelector((state) => state.auth);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/seller/returns`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setReturns(res.data.data || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-2">Returns & Refunds</h2>
        <p className="text-muted text-sm">Manage customer return requests and process refunds.</p>
      </div>

      <div className="bg-white rounded-[24px] border border-black/[0.07] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-black/[0.07]">
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Order ID</th>
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Product</th>
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Reason</th>
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-muted">Loading return requests...</td></tr>
              ) : returns.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-muted font-medium">No return requests found.</td></tr>
              ) : (
                returns.map((req) => (
                  <tr key={req.id} className="border-b border-black/[0.03] hover:bg-black/[0.02]">
                    <td className="p-4 font-mono text-sm text-muted">{req.orderItem?.orderId?.substring(0,8)}</td>
                    <td className="p-4 font-bold text-secondary">{req.orderItem?.product?.name}</td>
                    <td className="p-4 text-sm text-secondary">{req.reason}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 
                        req.status === 'APPROVED' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      {req.status === 'PENDING' && (
                        <>
                          <button className="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center hover:bg-success hover:text-white transition-colors">
                            <CheckCircle size={16} />
                          </button>
                          <button className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center hover:bg-error hover:text-white transition-colors">
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
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
