import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { DollarSign, Clock, CheckCircle, CreditCard } from 'lucide-react';
import GlassCard from '../ui/GlassCard.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function PayoutHistory() {
  const { accessToken } = useSelector((state) => state.auth);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/seller/payouts`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setPayouts(res.data.data || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const totalPaid = payouts.filter(p => p.status === 'COMPLETED').reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-2">Payout History</h2>
        <p className="text-muted text-sm">Track your earnings transfers from Paw-Mart.</p>
      </div>

      <GlassCard hoverEffect={false} className="p-8 border-black/[0.07] bg-primary/5">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <CreditCard size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Total Lifetime Payouts</p>
            <h3 className="text-4xl font-extrabold text-secondary">{formatCurrency(totalPaid)}</h3>
          </div>
        </div>
      </GlassCard>

      <div className="bg-white rounded-[24px] border border-black/[0.07] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-black/[0.07]">
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Transaction ID</th>
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Amount</th>
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="p-8 text-center text-muted">Loading payouts...</td></tr>
              ) : payouts.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-muted font-medium">No payouts recorded yet.</td></tr>
              ) : (
                payouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-black/[0.03] hover:bg-black/[0.02]">
                    <td className="p-4 font-mono text-sm text-muted">{payout.transactionId || 'Pending'}</td>
                    <td className="p-4 text-sm font-medium text-secondary">{new Date(payout.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 font-bold text-secondary">{formatCurrency(payout.amount)}</td>
                    <td className="p-4">
                      {payout.status === 'COMPLETED' ? (
                        <span className="flex items-center gap-1 text-success font-bold text-xs uppercase tracking-wider">
                          <CheckCircle size={14} /> Paid
                        </span>
                      ) : (
                        <span className="text-accent font-bold text-xs uppercase tracking-wider">Pending</span>
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
