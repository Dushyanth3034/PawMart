import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Wallet, DollarSign, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, AlertTriangle, Landmark } from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../ui/GlassCard.jsx';
import PremiumButton from '../ui/PremiumButton.jsx';
import MinimalInput from '../ui/MinimalInput.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function ProviderWallet() {
  const { accessToken } = useSelector((state) => state.auth);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const fetchWalletData = async () => {
    try {
      setError(null);
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [walletRes, transRes, payoutRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/wallet`, { headers, withCredentials: true }),
        axios.get(`${import.meta.env.VITE_API_URL}/wallet/transactions?limit=20`, { headers, withCredentials: true }),
        axios.get(`${import.meta.env.VITE_API_URL}/wallet/payouts`, { headers, withCredentials: true })
      ]);

      if (walletRes.data?.data) setWallet(walletRes.data.data);
      if (transRes.data?.data) setTransactions(transRes.data.data);
      if (payoutRes.data?.data) setPayouts(payoutRes.data.data);
    } catch (err) {
      console.error('Failed to fetch wallet information:', err);
      setError(err.response?.data?.message || 'Unable to load wallet information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchWalletData();
    }
  }, [accessToken]);

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const avail = wallet?.availableBalance || 0;
    const withdrawAmt = parseFloat(amount);
    if (!amount || isNaN(withdrawAmt) || withdrawAmt <= 0) {
      toast.error('Please enter a valid positive withdrawal amount.');
      return;
    }
    if (withdrawAmt < 100) {
      toast.error('Minimum payout amount is ₹100.');
      return;
    }
    if (withdrawAmt > avail) {
      const formattedAvail = Number.isInteger(avail) ? avail : avail.toFixed(2);
      toast.error(`Insufficient available balance. Your available balance is ₹${formattedAvail}.`);
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !ifscCode.trim() || !accountHolder.trim()) {
      toast.error('All bank account details are required.');
      return;
    }

    try {
      setSubmitting(true);
      const headers = { Authorization: `Bearer ${accessToken}` };
      await axios.post(
        `${import.meta.env.VITE_API_URL}/wallet/withdraw`,
        {
          amount: withdrawAmt,
          bankName,
          accountNumber,
          ifscCode,
          accountHolder
        },
        { headers, withCredentials: true }
      );

      toast.success('Withdrawal request submitted successfully! Payout status is PENDING.');
      setShowWithdrawModal(false);
      setAmount('');
      // Keep bank inputs for easy subsequent requests, but reset account details safely
      setAccountNumber('');
      fetchWalletData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request withdrawal.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Wallet & Settlements</h2>
          <p className="text-sm text-gray-500">View and manage your service earnings, pending escrows, and payout requests.</p>
        </div>
        <GlassCard className="p-8 border-red-100 bg-red-50/50 max-w-lg flex flex-col gap-4">
          <p className="font-semibold text-red-800">⚠️ {error}</p>
          <PremiumButton onClick={() => { setError(null); setLoading(true); fetchWalletData(); }} className="w-fit">
            Retry Loading
          </PremiumButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Wallet & Settlements</h2>
          <p className="text-sm text-gray-500">View and manage your service earnings, pending escrows, and payout requests.</p>
        </div>
        <PremiumButton 
          disabled={!wallet || wallet.availableBalance < 100}
          onClick={() => setShowWithdrawModal(true)} 
          className="flex items-center space-x-2"
        >
          <Landmark size={16} />
          <span>Request Payout</span>
        </PremiumButton>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <GlassCard className="p-5 border-black/[0.04] bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary/10 text-primary rounded-xl"><Wallet size={20} /></div>
          </div>
          <h4 className="text-2xl font-extrabold text-secondary font-outfit">{formatCurrency(wallet?.availableBalance || 0)}</h4>
          <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Available Balance</p>
        </GlassCard>

        <GlassCard className="p-5 border-black/[0.04]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-yellow-500/10 text-yellow-600 rounded-xl"><Clock size={20} /></div>
          </div>
          <h4 className="text-2xl font-extrabold text-secondary font-outfit">{formatCurrency(wallet?.pendingBalance || 0)}</h4>
          <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Pending Escrow</p>
        </GlassCard>

        <GlassCard className="p-5 border-black/[0.04]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl"><Landmark size={20} /></div>
          </div>
          <h4 className="text-2xl font-extrabold text-secondary font-outfit">{formatCurrency(wallet?.reservedBalance || 0)}</h4>
          <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Reserved Payout</p>
        </GlassCard>

        <GlassCard className="p-5 border-black/[0.04] bg-gradient-to-br from-success/5 to-transparent">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-success/10 text-success rounded-xl"><CheckCircle size={20} /></div>
          </div>
          <h4 className="text-2xl font-extrabold text-secondary font-outfit">{formatCurrency(wallet?.totalEarnings || 0)}</h4>
          <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Lifetime Net Earnings</p>
        </GlassCard>

        <GlassCard className="p-5 border-black/[0.04]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl"><ArrowUpRight size={20} /></div>
          </div>
          <h4 className="text-2xl font-extrabold text-secondary font-outfit">{formatCurrency(wallet?.totalWithdrawn || 0)}</h4>
          <p className="text-xs font-bold text-muted uppercase tracking-wider mt-1">Total Settled</p>
        </GlassCard>
      </div>

      {/* Grid of history and payouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Transaction log */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
            📊 Transaction Logs
          </h3>
          <div className="bg-white border border-black/[0.07] rounded-[24px] overflow-hidden shadow-sm">
            {transactions.length === 0 ? (
              <div className="p-12 text-center text-muted font-medium">No wallet transactions yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-black/[0.07]">
                      <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Details</th>
                      <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.03] text-sm">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-gray-500 tabular-nums">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-secondary">{tx.description || 'Wallet Transaction'}</p>
                          <p className="text-xs text-muted uppercase tracking-wider mt-0.5">{tx.type.replace(/_/g, ' ')}</p>
                        </td>
                        <td className="px-6 py-4 font-bold tabular-nums">
                          <span className={tx.type.includes('RELEASED') ? 'text-success' : 'text-secondary'}>
                            {tx.type.includes('RELEASED') ? '+' : ''}{formatCurrency(tx.netAmount)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            tx.status === 'COMPLETED' ? 'bg-success/10 text-success' :
                            tx.status === 'PENDING' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                            'bg-red-50 text-red-500'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Payout history */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
            🏦 Payout Requests
          </h3>
          <div className="bg-white border border-black/[0.07] rounded-[24px] p-6 space-y-4 shadow-sm">
            {payouts.length === 0 ? (
              <div className="text-center text-muted py-8 font-medium">No payouts requested yet.</div>
            ) : (
              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {payouts.map((po) => (
                  <div key={po.id} className="border border-black/[0.05] p-4 rounded-xl space-y-2 bg-surface/30">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-secondary text-sm">{formatCurrency(po.amount)}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        ['PAID', 'COMPLETED'].includes(po.status) ? 'bg-success/15 text-success' :
                        po.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                        po.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                        po.status === 'ON_HOLD' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-50 text-red-500'
                      }`}>
                        {po.status === 'ON_HOLD' ? 'On Hold — Admin Review' : po.status === 'PAID' ? 'Paid' : po.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted font-medium space-y-1">
                      <p>Bank: {po.bankName}</p>
                      <p>Account: {po.accountNumber}</p>
                      <p className="tabular-nums">Date: {new Date(po.requestedAt).toLocaleDateString()}</p>
                      {po.referenceNumber && <p className="text-primary font-semibold">Ref: {po.referenceNumber}</p>}
                      {po.rejectionReason && <p className="text-error font-semibold">Reason: {po.rejectionReason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Withdrawal Form Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] max-w-lg w-full shadow-premium p-8 relative">
            <button 
              onClick={() => setShowWithdrawModal(false)} 
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            >
              <XCircle size={20} />
            </button>

            <h3 className="text-2xl font-bold font-outfit text-secondary mb-6 flex items-center gap-2">
              <Landmark className="text-primary" /> Request Settlement Payout
            </h3>

            <form onSubmit={handleWithdrawSubmit} className="space-y-5">
              <div className="bg-surface/50 border border-black/[0.05] p-4 rounded-xl mb-4 flex items-center justify-between">
                <div className="text-xs font-semibold text-muted">
                  Available to withdraw: <span className="text-primary font-bold text-sm ml-1">{formatCurrency(wallet?.availableBalance || 0)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAmount((wallet?.availableBalance || 0).toString())}
                  className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Withdraw Full Balance
                </button>
              </div>

              <MinimalInput 
                required 
                type="number" 
                step="0.01"
                label="Amount (INR)" 
                placeholder="e.g. 500" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
              />

              <MinimalInput 
                required 
                label="Account Holder Name" 
                placeholder="e.g. Dr. Evelyn Carter" 
                value={accountHolder} 
                onChange={(e) => setAccountHolder(e.target.value)} 
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MinimalInput 
                  required 
                  label="Bank Name" 
                  placeholder="e.g. HDFC Bank" 
                  value={bankName} 
                  onChange={(e) => setBankName(e.target.value)} 
                />
                <MinimalInput 
                  required 
                  label="IFSC Code" 
                  placeholder="e.g. HDFC0001234" 
                  value={ifscCode} 
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())} 
                />
              </div>

              <MinimalInput 
                required 
                type="password"
                label="Bank Account Number" 
                placeholder="e.g. 50100234567890" 
                value={accountNumber} 
                onChange={(e) => setAccountNumber(e.target.value)} 
              />

              <div className="flex gap-2 justify-end mt-6">
                <PremiumButton 
                  type="button"
                  variant="ghost" 
                  onClick={() => setShowWithdrawModal(false)}
                >
                  Cancel
                </PremiumButton>
                <PremiumButton 
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </PremiumButton>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
