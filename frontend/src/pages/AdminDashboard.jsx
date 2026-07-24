import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  LayoutDashboard, Users, Store, Stethoscope, Dog, ShoppingBag,
  ClipboardList, Heart, Scale, Wallet, TrendingUp, Star, ScrollText,
  Settings, Search, CheckCircle, XCircle, AlertTriangle, Ban, RefreshCw,
  Trash2, IndianRupee, Save, RotateCcw, ShieldCheck, LogOut, ArrowUpRight,
  Clock, Package, FileText, Check, Eye
} from 'lucide-react';

import GlassCard from '../components/ui/GlassCard.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import ErrorBoundary from '../components/ui/ErrorBoundary.jsx';
import { clearCredentials } from '../redux/authSlice.js';

const API = import.meta.env.VITE_API_URL;

// ─── Formatters & Utility Functions ──────────────────────────────────────────
const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (n) => parseInt(n || 0).toLocaleString('en-IN');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const statusBadge = (status) => {
  const map = {
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    BLOCKED: 'bg-rose-100 text-rose-800 border-rose-200',
    INACTIVE: 'bg-slate-100 text-slate-700 border-slate-200',
    ADMIN_REVIEW: 'bg-orange-100 text-orange-800 border-orange-200',
    RELEASED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    HELD: 'bg-amber-100 text-amber-800 border-amber-200',
    DELIVERED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
  return `inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${map[status] || 'bg-slate-100 text-slate-700 border-slate-200'}`;
};

// ─── Deduplicated Toast Helper ────────────────────────────────────────────────
const toastTracker = {};
const safeToastError = (msg) => {
  const now = Date.now();
  if (toastTracker[msg] && now - toastTracker[msg] < 2500) return;
  toastTracker[msg] = now;
  toast.error(msg);
};

// ─── UI Helper Components ───────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent = 'primary' }) {
  return (
    <GlassCard hoverEffect className="p-6 border-black/[0.05] bg-surface">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">{label}</p>
          <h3 className="text-2xl font-extrabold font-outfit text-secondary">{value}</h3>
          {sub && <p className="text-xs font-medium text-muted mt-1">{sub}</p>}
        </div>
        <div className="w-12 h-12 rounded-[14px] bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Icon size={22} />
        </div>
      </div>
    </GlassCard>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-extrabold font-outfit text-secondary">{title}</h2>
      {sub && <p className="text-sm font-medium text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyState({ message = 'No records found.' }) {
  return (
    <GlassCard className="text-center py-16 px-4 border-black/[0.05]">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 text-primary">
        <ScrollText size={24} />
      </div>
      <p className="text-muted font-medium text-sm">{message}</p>
    </GlassCard>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Pagination({ page, total, limit, onPage }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-black/[0.06]">
      <p className="text-muted text-xs font-medium">Page {page} of {totalPages} ({total} total records)</p>
      <div className="flex gap-2">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="px-3 py-1.5 rounded-[8px] bg-black/5 text-secondary font-bold text-xs disabled:opacity-40 hover:bg-black/10 transition-colors">
          Previous
        </button>
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-[8px] bg-black/5 text-secondary font-bold text-xs disabled:opacity-40 hover:bg-black/10 transition-colors">
          Next
        </button>
      </div>
    </div>
  );
}

// ─── Tab Panels ─────────────────────────────────────────────────────────────
function DashboardPanel({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    let isMounted = true;
    axios.get(`${API}/admin/dashboard`, authHeader)
      .then(r => { if (isMounted) setData(r.data.data); })
      .catch(() => safeToastError('Failed to load dashboard statistics'))
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [token]);

  if (loading) return <Spinner />;
  if (!data) return <EmptyState message="Unable to load dashboard data." />;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <GlassCard className="p-8 border-black/[0.05] bg-gradient-to-br from-primary/5 via-surface to-surface relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Platform Control Center</p>
            <h2 className="text-3xl font-extrabold font-outfit text-secondary">PawMart Admin Overview</h2>
            <p className="text-sm font-medium text-muted mt-1">Live data queried directly from PostgreSQL</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Healthy
          </div>
        </div>
      </GlassCard>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={fmtNum(data.users?.total)} sub={`${fmtNum(data.users?.buyers)} Buyers`} />
        <StatCard icon={Store} label="Active Sellers" value={fmtNum(data.users?.sellers)} />
        <StatCard icon={Stethoscope} label="Providers" value={fmtNum(data.users?.providers)} />
        <StatCard icon={IndianRupee} label="Platform Revenue" value={fmt(data.platform?.totalRevenue)} sub="Total Commission Earned" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total Products" value={fmtNum(data.marketplace?.totalProducts)} />
        <StatCard icon={ShoppingBag} label="Total Orders" value={fmtNum(data.marketplace?.totalOrders)} />
        <StatCard icon={ClipboardList} label="Appointments" value={fmtNum(data.services?.totalAppointments)} />
        <StatCard icon={Heart} label="Adoptions" value={fmtNum(data.services?.totalAdoptions)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Wallet} label="Order Gross Revenue" value={fmt(data.marketplace?.totalOrderRevenue)} />
        <StatCard icon={Scale} label="Pending Disputes" value={fmtNum(data.operations?.activeDisputes)} />
        <StatCard icon={IndianRupee} label="Pending Payouts" value={fmtNum(data.operations?.pendingPayouts)} />
      </div>

      {/* Recent Audit Logs */}
      <GlassCard className="p-6 border-black/[0.05]">
        <h3 className="text-lg font-bold font-outfit text-secondary mb-4 flex items-center gap-2">
          <ScrollText size={18} className="text-primary" /> Recent Audit Activity
        </h3>
        {(!data.recentAuditLogs || data.recentAuditLogs.length === 0) ? (
          <p className="text-muted text-sm py-4">No recent audit activity recorded.</p>
        ) : (
          <div className="divide-y divide-black/[0.05]">
            {data.recentAuditLogs.map(log => (
              <div key={log.id} className="py-3 flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-secondary">{log.action.replace(/_/g, ' ')}</p>
                  <p className="text-xs font-medium text-muted">{log.description || 'Action performed'} · {fmtDateTime(log.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Current Settings Overview */}
      <GlassCard className="p-6 border-black/[0.05]">
        <h3 className="text-lg font-bold font-outfit text-secondary mb-4 flex items-center gap-2">
          <Settings size={18} className="text-primary" /> Active Platform Coefficients
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-black/[0.02] border border-black/[0.05] p-4 rounded-[16px]">
            <p className="text-xs font-bold text-muted uppercase">Commission Rate</p>
            <p className="text-xl font-extrabold font-outfit text-primary mt-1">{data.platformSettings?.platformCommissionRate}%</p>
          </div>
          <div className="bg-black/[0.02] border border-black/[0.05] p-4 rounded-[16px]">
            <p className="text-xs font-bold text-muted uppercase">Premium Fee</p>
            <p className="text-xl font-extrabold font-outfit text-primary mt-1">{fmt(data.platformSettings?.premiumListingFee)}</p>
          </div>
          <div className="bg-black/[0.02] border border-black/[0.05] p-4 rounded-[16px]">
            <p className="text-xs font-bold text-muted uppercase">Escrow Period</p>
            <p className="text-xl font-extrabold font-outfit text-primary mt-1">{data.platformSettings?.escrowConfirmationPeriod}h</p>
          </div>
          <div className="bg-black/[0.02] border border-black/[0.05] p-4 rounded-[16px]">
            <p className="text-xs font-bold text-muted uppercase">Min Withdrawal</p>
            <p className="text-xl font-extrabold font-outfit text-primary mt-1">{fmt(data.platformSettings?.minWithdrawalAmount)}</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function UsersPanel({ token }) {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);

    axios.get(`${API}/admin/users?${params}`, authHeader)
      .then(r => {
        setUsers(r.data.data || []);
        setTotal(r.data.total || 0);
      })
      .catch(() => safeToastError('Failed to load user list'))
      .finally(() => setLoading(false));
  }, [page, search, roleFilter, token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async (id, action) => {
    setActionLoading(id);
    try {
      await axios.patch(`${API}/admin/users/${id}/${action}`, {}, authHeader);
      toast.success(`User ${action}d successfully`);
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || `Failed to ${action} user`);
    } finally { setActionLoading(null); }
  };

  return (
    <div>
      <SectionHeader title="User Management" sub="Monitor and manage all registered accounts on PawMart" />
      <GlassCard className="p-6 border-black/[0.05]">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email…"
              className="w-full bg-white border border-black/10 rounded-[12px] pl-10 pr-4 py-2.5 text-sm text-secondary placeholder-muted focus:outline-none focus:border-primary font-medium"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="bg-white border border-black/10 rounded-[12px] px-4 py-2.5 text-sm text-secondary font-medium focus:outline-none focus:border-primary"
          >
            <option value="">All Roles</option>
            <option value="BUYER">Buyer</option>
            <option value="SELLER">Seller</option>
            <option value="PROVIDER">Provider</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        {loading ? <Spinner /> : users.length === 0 ? <EmptyState message="No users match your criteria." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-black/[0.08] text-xs font-bold text-muted uppercase tracking-wider">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Joined</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-black/[0.02] transition-colors">
                    <td className="py-3.5 pr-4">
                      <p className="font-bold text-secondary">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={statusBadge(u.role)}>{u.role === 'SERVICE_PROVIDER' ? 'PROVIDER' : u.role}</span>
                    </td>
                    <td className="py-3.5 pr-4 text-xs font-medium text-muted">{fmtDate(u.createdAt)}</td>
                    <td className="py-3.5 pr-4">
                      {u.isSuspended
                        ? <span className={statusBadge('BLOCKED')}>Suspended</span>
                        : <span className={statusBadge('ACTIVE')}>Active</span>}
                    </td>
                    <td className="py-3.5">
                      {u.isSuspended ? (
                        <button onClick={() => handleAction(u.id, 'reactivate')} disabled={actionLoading === u.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-[8px] font-bold text-xs hover:bg-emerald-200 transition-colors disabled:opacity-50">
                          <RefreshCw size={13} /> Reactivate
                        </button>
                      ) : (
                        <button onClick={() => handleAction(u.id, 'suspend')} disabled={actionLoading === u.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-800 rounded-[8px] font-bold text-xs hover:bg-rose-200 transition-colors disabled:opacity-50">
                          <Ban size={13} /> Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={total} limit={20} onPage={setPage} />
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function VerificationPanel({ type, token }) {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };
  const endpoint = type === 'sellers' ? 'sellers' : 'providers';
  const label = type === 'sellers' ? 'Seller' : 'Provider';

  const fetchRecords = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (statusFilter) params.set('status', statusFilter);
    axios.get(`${API}/admin/${endpoint}?${params}`, authHeader)
      .then(r => { setRecords(r.data.data || []); setTotal(r.data.total || 0); })
      .catch(() => safeToastError(`Failed to load ${label.toLowerCase()} applications`))
      .finally(() => setLoading(false));
  }, [page, statusFilter, token, endpoint, label]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleAction = async (id, action, reason = '') => {
    setActionLoading(id);
    try {
      await axios.patch(`${API}/admin/${endpoint}/${id}/verify`, { action, rejectionReason: reason }, authHeader);
      toast.success(`${label} ${action.toLowerCase()}d successfully`);
      setRejectModal(null);
      setRejectReason('');
      fetchRecords();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Verification action failed');
    } finally { setActionLoading(null); }
  };

  const nameKey = type === 'sellers' ? 'storeName' : 'businessName';
  const profileKey = type === 'sellers' ? 'storeProfile' : 'providerProfile';

  return (
    <div>
      <SectionHeader title={`${label} Verification Queue`} sub={`Review and approve ${label.toLowerCase()} onboarding applications`} />
      <GlassCard className="p-6 border-black/[0.05]">
        <div className="mb-6">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-white border border-black/10 rounded-[12px] px-4 py-2.5 text-sm text-secondary font-medium focus:outline-none focus:border-primary">
            <option value="">All Verification Statuses</option>
            <option value="PENDING">Pending Approval</option>
            <option value="APPROVED">Approved / Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {loading ? <Spinner /> : records.length === 0 ? <EmptyState message={`No ${label.toLowerCase()} records found.`} /> : (
          <div className="space-y-4">
            {records.map(rec => {
              // Handle both User records directly and legacy Verification records
              const user = rec.user || rec;
              const storeProf = user?.storeProfile;
              const provProf = user?.providerProfile;
              const verifStatus = rec.status || (user.isVerified ? 'APPROVED' : 'PENDING');
              const busName = storeProf?.storeName || provProf?.businessName || rec.businessName || 'Standard Profile';
              const prodCount = user._count?.products ?? user._count?.services ?? 0;
              const ordCount = user._count?.orders ?? user._count?.appointmentsAsProv ?? 0;

              return (
                <div key={rec.id || user.id} className="bg-black/[0.02] border border-black/[0.06] rounded-[16px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-secondary text-base">{user?.firstName} {user?.lastName}</h4>
                      <span className={statusBadge(user?.role || type)}>{user?.role === 'SERVICE_PROVIDER' ? 'PROVIDER' : user?.role || type}</span>
                      <span className={statusBadge(verifStatus)}>{verifStatus}</span>
                      {user?.isSuspended && <span className={statusBadge('BLOCKED')}>Suspended</span>}
                    </div>
                    <p className="text-xs font-medium text-muted mt-0.5">{user?.email} {user?.phone ? `· ${user.phone}` : ''}</p>
                    <p className="text-xs font-semibold text-primary mt-1">Business: {busName}</p>
                    <div className="flex gap-4 text-xs text-muted mt-1">
                      {type === 'sellers' ? (
                        <><span>Listings: <strong>{prodCount}</strong></span><span>Orders: <strong>{ordCount}</strong></span></>
                      ) : (
                        <><span>Services: <strong>{prodCount}</strong></span><span>Appointments: <strong>{ordCount}</strong></span></>
                      )}
                      <span>Joined: {fmtDate(user?.createdAt || rec.createdAt)}</span>
                    </div>
                  </div>
                  {rec.sellerVerification?.id || rec.providerVerification?.id || rec.status === 'PENDING' ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleAction(rec.sellerVerification?.id || rec.providerVerification?.id || rec.id, 'APPROVE')} disabled={actionLoading === (rec.id || user.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-[10px] font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50">
                        <CheckCircle size={14} /> Verify
                      </button>
                      <button onClick={() => { setRejectModal(rec.sellerVerification?.id || rec.providerVerification?.id || rec.id); setRejectReason(''); }} disabled={actionLoading === (rec.id || user.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-[10px] font-bold text-xs hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50">
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
            <Pagination page={page} total={total} limit={20} onPage={setPage} />
          </div>
        )}
      </GlassCard>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white border border-black/10 rounded-[24px] p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-extrabold font-outfit text-secondary mb-2">Rejection Reason</h3>
              <p className="text-xs font-medium text-muted mb-4">Please specify why this application is being rejected.</p>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Enter rejection notes for the user…"
                className="w-full bg-black/[0.02] border border-black/10 rounded-[12px] p-3 text-sm text-secondary placeholder-muted focus:outline-none focus:border-primary resize-none h-24 mb-4 font-medium" />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setRejectModal(null)} className="px-4 py-2 text-xs font-bold text-muted hover:text-secondary">Cancel</button>
                <button onClick={() => handleAction(rejectModal, 'REJECT', rejectReason)} disabled={!rejectReason.trim()}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-[10px] hover:bg-rose-700 transition-colors disabled:opacity-50 shadow-sm">
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductsPanel({ token }) {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (statusFilter) params.set('status', statusFilter);
    axios.get(`${API}/admin/products?${params}`, authHeader)
      .then(r => { setProducts(r.data.data || []); setTotal(r.data.total || 0); })
      .catch(() => safeToastError('Failed to load product listings'))
      .finally(() => setLoading(false));
  }, [page, statusFilter, token]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const setStatus = async (id, status) => {
    setActionLoading(id);
    try {
      await axios.patch(`${API}/admin/products/${id}/status`, { status }, authHeader);
      toast.success(`Product status updated to ${status}`);
      fetchProducts();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update product status');
    } finally { setActionLoading(null); }
  };

  return (
    <div>
      <SectionHeader title="Products & Marketplace Listings" sub="Manage product availability and block suspicious listings" />
      <GlassCard className="p-6 border-black/[0.05]">
        <div className="mb-6">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-white border border-black/10 rounded-[12px] px-4 py-2.5 text-sm text-secondary font-medium focus:outline-none focus:border-primary">
            <option value="">All Listing Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>

        {loading ? <Spinner /> : products.length === 0 ? <EmptyState message="No product listings found." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-black/[0.08] text-xs font-bold text-muted uppercase tracking-wider">
                  <th className="pb-3 pr-4">Product Name</th>
                  <th className="pb-3 pr-4">Seller</th>
                  <th className="pb-3 pr-4">Price</th>
                  <th className="pb-3 pr-4">Stock</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-black/[0.02] transition-colors">
                    <td className="py-3.5 pr-4">
                      <p className="font-bold text-secondary">{p.name}</p>
                      <p className="text-xs text-muted">{p.category?.name || 'Uncategorized'}</p>
                    </td>
                    <td className="py-3.5 pr-4 text-xs font-medium text-secondary">{p.seller?.firstName} {p.seller?.lastName}</td>
                    <td className="py-3.5 pr-4 font-bold text-secondary">{fmt(p.price)}</td>
                    <td className="py-3.5 pr-4 font-semibold text-secondary">{p.stock}</td>
                    <td className="py-3.5 pr-4"><span className={statusBadge(p.status)}>{p.status}</span></td>
                    <td className="py-3.5">
                      <div className="flex gap-2">
                        {p.status !== 'ACTIVE' && (
                          <button onClick={() => setStatus(p.id, 'ACTIVE')} disabled={actionLoading === p.id}
                            className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-[6px] font-bold text-xs hover:bg-emerald-200 transition-colors disabled:opacity-50">
                            Activate
                          </button>
                        )}
                        {p.status !== 'BLOCKED' && (
                          <button onClick={() => setStatus(p.id, 'BLOCKED')} disabled={actionLoading === p.id}
                            className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-[6px] font-bold text-xs hover:bg-rose-200 transition-colors disabled:opacity-50">
                            Block
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={total} limit={20} onPage={setPage} />
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function AppointmentsPanel({ token }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchAppointments = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (statusFilter) params.set('status', statusFilter);
    axios.get(`${API}/admin/appointments?${params}`, authHeader)
      .then(r => { setItems(r.data.data || []); setTotal(r.data.total || 0); })
      .catch(() => safeToastError('Failed to load appointments'))
      .finally(() => setLoading(false));
  }, [page, statusFilter, token]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  return (
    <div>
      <SectionHeader title="Service Appointments" sub="Read-only log of all clinic service bookings" />
      <GlassCard className="p-6 border-black/[0.05]">
        <div className="mb-6">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-white border border-black/10 rounded-[12px] px-4 py-2.5 text-sm text-secondary font-medium focus:outline-none focus:border-primary">
            <option value="">All Appointment Statuses</option>
            <option value="BOOKED">Booked</option>
            <option value="COMPLETED">Completed</option>
            <option value="AWAITING_CUSTOMER_CONFIRMATION">Awaiting Customer Confirmation</option>
            <option value="ADMIN_REVIEW">Admin Review</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>

        {loading ? <Spinner /> : items.length === 0 ? <EmptyState message="No appointment records found." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-black/[0.08] text-xs font-bold text-muted uppercase tracking-wider">
                  <th className="pb-3 pr-4">Service</th>
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Provider</th>
                  <th className="pb-3 pr-4">Total Amount</th>
                  <th className="pb-3 pr-4">Booking Status</th>
                  <th className="pb-3">Booking Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {items.map(a => (
                  <tr key={a.id} className="hover:bg-black/[0.02] transition-colors">
                    <td className="py-3.5 pr-4 font-bold text-secondary">{a.service?.name || 'Clinic Service'}</td>
                    <td className="py-3.5 pr-4 text-xs font-medium text-secondary">{a.buyer?.firstName} {a.buyer?.lastName}</td>
                    <td className="py-3.5 pr-4 text-xs font-medium text-secondary">{a.provider?.firstName} {a.provider?.lastName}</td>
                    <td className="py-3.5 pr-4 font-bold text-secondary">{fmt((a.commissionAmount || 0) + (a.providerAmount || 0))}</td>
                    <td className="py-3.5 pr-4"><span className={statusBadge(a.bookingStatus)}>{a.bookingStatus?.replace(/_/g, ' ')}</span></td>
                    <td className="py-3.5 text-xs text-muted">{fmtDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={total} limit={20} onPage={setPage} />
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function OrdersPanel({ token }) {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (statusFilter) params.set('status', statusFilter);
    axios.get(`${API}/admin/orders?${params}`, authHeader)
      .then(r => { setOrders(r.data.data || []); setTotal(r.data.total || 0); })
      .catch(() => safeToastError('Failed to load orders'))
      .finally(() => setLoading(false));
  }, [page, statusFilter, token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return (
    <div>
      <SectionHeader title="Marketplace Orders" sub="Read-only order tracking across all sellers" />
      <GlassCard className="p-6 border-black/[0.05]">
        <div className="mb-6">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-white border border-black/10 rounded-[12px] px-4 py-2.5 text-sm text-secondary font-medium focus:outline-none focus:border-primary">
            <option value="">All Order Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {loading ? <Spinner /> : orders.length === 0 ? <EmptyState message="No order records found." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-black/[0.08] text-xs font-bold text-muted uppercase tracking-wider">
                  <th className="pb-3 pr-4">Buyer</th>
                  <th className="pb-3 pr-4">Items Summary</th>
                  <th className="pb-3 pr-4">Total Amount</th>
                  <th className="pb-3 pr-4">Order Status</th>
                  <th className="pb-3">Order Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-black/[0.02] transition-colors">
                    <td className="py-3.5 pr-4">
                      <p className="font-bold text-secondary">{o.buyer?.firstName} {o.buyer?.lastName}</p>
                      <p className="text-xs text-muted">{o.buyer?.email}</p>
                    </td>
                    <td className="py-3.5 pr-4 text-xs font-medium text-muted">
                      {(o.orderItems || []).map(i => i.product?.name).filter(Boolean).join(', ').slice(0, 45) || 'Product Order'}…
                    </td>
                    <td className="py-3.5 pr-4 font-bold text-secondary">{fmt(o.totalAmount || o.total)}</td>
                    <td className="py-3.5 pr-4"><span className={statusBadge(o.status)}>{o.status}</span></td>
                    <td className="py-3.5 text-xs text-muted">{fmtDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={total} limit={20} onPage={setPage} />
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function AdoptionsPanel({ token }) {
  const [adoptions, setAdoptions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchAdoptions = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/admin/adoptions?page=${page}&limit=20`, authHeader)
      .then(r => { setAdoptions(r.data.data || []); setTotal(r.data.total || 0); })
      .catch(() => safeToastError('Failed to load adoptions'))
      .finally(() => setLoading(false));
  }, [page, token]);

  useEffect(() => { fetchAdoptions(); }, [fetchAdoptions]);

  return (
    <div>
      <SectionHeader title="Adoption Applications" sub="Track pet adoption requests submitted by buyers" />
      <GlassCard className="p-6 border-black/[0.05]">
        {loading ? <Spinner /> : adoptions.length === 0 ? <EmptyState message="No adoption applications found." /> : (
          <div className="space-y-3">
            {adoptions.map(a => (
              <div key={a.id} className="bg-black/[0.02] border border-black/[0.06] rounded-[16px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-secondary text-sm">{a.buyer?.firstName} {a.buyer?.lastName}</h4>
                  <p className="text-xs text-muted">{a.buyer?.email}</p>
                  <p className="text-xs font-semibold text-primary mt-1">Pet: {a.pet?.name} ({a.pet?.category?.name || 'Pet'})</p>
                </div>
                <div className="sm:text-right">
                  <span className={statusBadge(a.status)}>{a.status}</span>
                  <p className="text-xs text-muted mt-1">Submitted: {fmtDate(a.createdAt)}</p>
                </div>
              </div>
            ))}
            <Pagination page={page} total={total} limit={20} onPage={setPage} />
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function DisputesPanel({ token }) {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [resolveModal, setResolveModal] = useState(null);
  const [decision, setDecision] = useState('RELEASE');
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchDisputes = () => {
    setLoading(true);
    axios.get(`${API}/admin/disputes`, authHeader)
      .then(r => setDisputes(r.data.data || []))
      .catch(() => safeToastError('Failed to load disputes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDisputes(); }, []);

  const handleResolve = async () => {
    if (!resolveModal) return;
    setActionLoading(resolveModal);
    try {
      await axios.patch(`${API}/admin/disputes/${resolveModal}/resolve`, { decision }, authHeader);
      toast.success('Dispute resolved successfully');
      setResolveModal(null);
      fetchDisputes();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to resolve dispute');
    } finally { setActionLoading(null); }
  };

  return (
    <div>
      <SectionHeader title="Service Disputes" sub="Resolve customer disputes held in escrow review" />
      <GlassCard className="p-6 border-black/[0.05]">
        {loading ? <Spinner /> : disputes.length === 0 ? <EmptyState message="No active disputes requiring review." /> : (
          <div className="space-y-4">
            {disputes.map(d => (
              <div key={d.id} className="bg-amber-50/50 border border-amber-200 rounded-[16px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <h4 className="font-bold text-secondary text-base">{d.service?.name || 'Clinic Service'}</h4>
                  </div>
                  <p className="text-xs text-muted">Buyer: {d.buyer?.firstName} {d.buyer?.lastName} ({d.buyer?.email})</p>
                  <p className="text-xs text-muted">Provider: {d.provider?.providerProfile?.businessName || `${d.provider?.firstName} ${d.provider?.lastName}`}</p>
                  <p className="text-xs font-bold text-primary mt-1">Escrow Amount: {fmt((d.commissionAmount || 0) + (d.providerAmount || 0))}</p>
                </div>
                <button onClick={() => { setResolveModal(d.id); setDecision('RELEASE'); }}
                  className="px-4 py-2 bg-primary text-white rounded-[10px] font-bold text-xs hover:bg-primary/90 transition-colors shadow-sm shrink-0">
                  Resolve Dispute
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Resolve Modal */}
      <AnimatePresence>
        {resolveModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white border border-black/10 rounded-[24px] p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-extrabold font-outfit text-secondary mb-2">Dispute Resolution</h3>
              <p className="text-xs font-medium text-muted mb-4">Choose how the disputed escrow funds should be settled.</p>
              <div className="space-y-3 mb-6">
                <button onClick={() => setDecision('RELEASE')}
                  className={`w-full py-3 px-4 rounded-[12px] font-bold text-sm text-left transition-all border ${decision === 'RELEASE' ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm' : 'bg-black/[0.02] border-black/10 text-muted'}`}>
                  Release to Provider
                </button>
                <button onClick={() => setDecision('REFUND')}
                  className={`w-full py-3 px-4 rounded-[12px] font-bold text-sm text-left transition-all border ${decision === 'REFUND' ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm' : 'bg-black/[0.02] border-black/10 text-muted'}`}>
                  Refund to Customer
                </button>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setResolveModal(null)} className="px-4 py-2 text-xs font-bold text-muted hover:text-secondary">Cancel</button>
                <button onClick={handleResolve} disabled={actionLoading === resolveModal}
                  className="px-5 py-2 text-xs font-bold bg-primary text-white rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm">
                  Confirm Resolution
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PayoutsPanel({ token }) {
  const [payouts, setPayouts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchPayouts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    axios.get(`${API}/admin/payouts?${params}`, authHeader)
      .then(r => setPayouts(r.data.data || []))
      .catch(() => safeToastError('Failed to load payout requests'))
      .finally(() => setLoading(false));
  }, [statusFilter, token]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const approve = async (id) => {
    setActionLoading(id);
    try {
      await axios.patch(`${API}/admin/payouts/${id}/approve`, {}, authHeader);
      toast.success('Payout approved and settled');
      fetchPayouts();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Payout approval failed');
    } finally { setActionLoading(null); }
  };

  const reject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionLoading(rejectModal);
    try {
      await axios.patch(`${API}/admin/payouts/${rejectModal}/reject`, { rejectionReason: rejectReason }, authHeader);
      toast.success('Payout rejected and funds returned to user wallet');
      setRejectModal(null);
      fetchPayouts();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Payout rejection failed');
    } finally { setActionLoading(null); }
  };

  return (
    <div>
      <SectionHeader title="Wallet Payout System" sub="Monitor automatic payout processing and resolve requests placed on hold" />
      <GlassCard className="p-6 border-black/[0.05]">
        <div className="mb-6">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-black/10 rounded-[12px] px-4 py-2.5 text-sm text-secondary font-medium focus:outline-none focus:border-primary">
            <option value="">All Payout Statuses</option>
            <option value="PAID">Paid (Settled)</option>
            <option value="ON_HOLD">On Hold (Requires Review)</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="REJECTED">Rejected</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {loading ? <Spinner /> : payouts.length === 0 ? <EmptyState message="No withdrawal payout records found." /> : (
          <div className="space-y-4">
            {payouts.map(p => {
              const user = p.wallet?.user;
              return (
                <div key={p.id} className="bg-black/[0.02] border border-black/[0.06] rounded-[16px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-secondary text-base">{user?.firstName} {user?.lastName}</h4>
                      <span className={statusBadge(user?.role)}>{user?.role}</span>
                      <span className={statusBadge(p.status)}>{p.status === 'ON_HOLD' ? 'ON HOLD (Review)' : p.status}</span>
                    </div>
                    <p className="text-xs text-muted">{user?.email}</p>
                    <p className="text-xl font-extrabold font-outfit text-primary mt-1">{fmt(p.amount)}</p>
                    <p className="text-xs text-muted mt-0.5">Bank: {p.bankName || 'N/A'} · A/C: {p.accountNumber ? `••••••${p.accountNumber.slice(-4)}` : 'N/A'}</p>
                    <p className="text-xs text-muted">Requested: {fmtDateTime(p.requestedAt)}</p>
                    {p.rejectionReason && <p className="text-xs font-semibold text-rose-600 mt-1">Notes: {p.rejectionReason}</p>}
                  </div>
                  {['PENDING', 'ON_HOLD'].includes(p.status) && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => approve(p.id)} disabled={actionLoading === p.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-[10px] font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50">
                        <CheckCircle size={14} /> Release Payout
                      </button>
                      <button onClick={() => { setRejectModal(p.id); setRejectReason(''); }} disabled={actionLoading === p.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-[10px] font-bold text-xs hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50">
                        <XCircle size={14} /> Reject & Refund
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Reject Payout Modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white border border-black/10 rounded-[24px] p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-extrabold font-outfit text-secondary mb-2">Reject Payout Request</h3>
              <p className="text-xs font-medium text-muted mb-4">Enter a reason. The reserved funds will be returned to the user's available balance.</p>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection…"
                className="w-full bg-black/[0.02] border border-black/10 rounded-[12px] p-3 text-sm text-secondary placeholder-muted focus:outline-none focus:border-primary resize-none h-24 mb-4 font-medium" />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setRejectModal(null)} className="px-4 py-2 text-xs font-bold text-muted hover:text-secondary">Cancel</button>
                <button onClick={reject} disabled={!rejectReason.trim() || actionLoading === rejectModal}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-[10px] hover:bg-rose-700 transition-colors disabled:opacity-50 shadow-sm">
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FinancePanel({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    let isMounted = true;
    axios.get(`${API}/admin/finance`, authHeader)
      .then(r => { if (isMounted) setData(r.data.data); })
      .catch(() => safeToastError('Failed to load platform finance data'))
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [token]);

  if (loading) return <Spinner />;
  if (!data) return <EmptyState message="Unable to load financial analytics." />;

  const ws = data.walletSummary || {};

  return (
    <div className="space-y-6">
      <SectionHeader title="Platform Finance Overview" sub="Aggregated revenue, wallet balances, and payout statistics" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={IndianRupee} label="Total Platform Revenue" value={fmt(data.totalPlatformRevenue)} />
        <StatCard icon={TrendingUp} label="Service Commission Earned" value={fmt(data.serviceCommissionEarned)} />
        <StatCard icon={ShoppingBag} label="Order Commission Earned" value={fmt(data.orderCommissionEarned)} />
      </div>

      <GlassCard className="p-6 border-black/[0.05]">
        <h3 className="text-lg font-bold font-outfit text-secondary mb-4">Platform Wallet Aggregates</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-black/[0.02] border border-black/[0.05] p-4 rounded-[16px]">
            <p className="text-xs font-bold text-muted uppercase">Total Earnings</p>
            <p className="text-lg font-extrabold font-outfit text-secondary mt-1">{fmt(ws.totalEarnings)}</p>
          </div>
          <div className="bg-black/[0.02] border border-black/[0.05] p-4 rounded-[16px]">
            <p className="text-xs font-bold text-muted uppercase">Available Balance</p>
            <p className="text-lg font-extrabold font-outfit text-secondary mt-1">{fmt(ws.availableBalance)}</p>
          </div>
          <div className="bg-black/[0.02] border border-black/[0.05] p-4 rounded-[16px]">
            <p className="text-xs font-bold text-muted uppercase">Pending Escrow</p>
            <p className="text-lg font-extrabold font-outfit text-secondary mt-1">{fmt(ws.pendingBalance)}</p>
          </div>
          <div className="bg-black/[0.02] border border-black/[0.05] p-4 rounded-[16px]">
            <p className="text-xs font-bold text-muted uppercase">Reserved Payouts</p>
            <p className="text-lg font-extrabold font-outfit text-secondary mt-1">{fmt(ws.reservedBalance)}</p>
          </div>
          <div className="bg-black/[0.02] border border-black/[0.05] p-4 rounded-[16px]">
            <p className="text-xs font-bold text-muted uppercase">Total Settled</p>
            <p className="text-lg font-extrabold font-outfit text-secondary mt-1">{fmt(ws.totalWithdrawn)}</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function SettingsPanel({ token }) {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    let isMounted = true;
    axios.get(`${API}/admin/settings`, authHeader)
      .then(r => {
        if (isMounted) {
          setSettings(r.data.data);
          setForm({
            platformCommissionRate: r.data.data.platformCommissionRate,
            premiumListingFee: r.data.data.premiumListingFee,
            escrowConfirmationPeriod: r.data.data.escrowConfirmationPeriod,
            minWithdrawalAmount: r.data.data.minWithdrawalAmount
          });
        }
      })
      .catch(() => safeToastError('Failed to load platform settings'))
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [token]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await axios.patch(`${API}/admin/settings`, {
        platformCommissionRate: parseFloat(form.platformCommissionRate),
        premiumListingFee: parseFloat(form.premiumListingFee),
        escrowConfirmationPeriod: parseInt(form.escrowConfirmationPeriod),
        minWithdrawalAmount: parseFloat(form.minWithdrawalAmount)
      }, authHeader);
      setSettings(r.data.data);
      toast.success('Platform settings saved successfully in PostgreSQL!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save platform settings');
    } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionHeader title="Platform Settings" sub="Updates take effect immediately on new transactions. Past transactions are immutable." />
      <GlassCard className="p-6 border-black/[0.05] max-w-xl">
        <div className="space-y-5">
          {[
            { key: 'platformCommissionRate', label: 'Commission Rate (%)', hint: 'Applied to new appointments and marketplace orders', min: 0, max: 100, step: 0.1 },
            { key: 'premiumListingFee', label: 'Premium Listing Fee (₹)', hint: 'Charge for additional pet/product listings', min: 0, step: 1 },
            { key: 'escrowConfirmationPeriod', label: 'Escrow Confirmation Period (hours)', hint: 'Time allowed before service completion auto-releases payment', min: 1, step: 1 },
            { key: 'minWithdrawalAmount', label: 'Minimum Withdrawal Amount (₹)', hint: 'Minimum amount a seller/provider can request to withdraw', min: 0, step: 1 },
          ].map(field => (
            <div key={field.key}>
              <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1.5">{field.label}</label>
              <input
                type="number"
                value={form[field.key] ?? ''}
                min={field.min}
                max={field.max}
                step={field.step}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                className="w-full bg-white border border-black/10 rounded-[12px] px-4 py-2.5 text-sm text-secondary font-medium focus:outline-none focus:border-primary"
              />
              <p className="text-xs font-medium text-muted mt-1">{field.hint}</p>
            </div>
          ))}
          <div className="flex gap-3 pt-3 border-t border-black/[0.06]">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-[10px] font-bold text-xs hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50">
              <Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}
            </button>
            <button onClick={() => setForm({ platformCommissionRate: settings.platformCommissionRate, premiumListingFee: settings.premiumListingFee, escrowConfirmationPeriod: settings.escrowConfirmationPeriod, minWithdrawalAmount: settings.minWithdrawalAmount })}
              className="flex items-center gap-2 px-4 py-2.5 bg-black/5 text-muted rounded-[10px] font-bold text-xs hover:bg-black/10 transition-colors">
              <RotateCcw size={15} /> Reset
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function AuditLogsPanel({ token }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchLogs = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/admin/audit-logs?page=${page}&limit=50`, authHeader)
      .then(r => { setLogs(r.data.data || []); setTotal(r.data.total || 0); })
      .catch(() => safeToastError('Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, [page, token]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div>
      <SectionHeader title="Audit Logs" sub="Immutable administrative event records" />
      <GlassCard className="p-6 border-black/[0.05]">
        {loading ? <Spinner /> : logs.length === 0 ? <EmptyState message="No audit logs recorded yet." /> : (
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="bg-black/[0.02] border border-black/[0.05] rounded-[14px] p-4 flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5 font-mono">{log.action}</span>
                      <p className="text-sm font-bold text-secondary mt-1">{log.description || '—'}</p>
                      <p className="text-xs text-muted">Admin: {log.user?.firstName} {log.user?.lastName} ({log.user?.email || 'System'})</p>
                    </div>
                    <span className="text-xs text-muted shrink-0 font-medium">{fmtDateTime(log.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
            <Pagination page={page} total={total} limit={50} onPage={setPage} />
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function ReviewsPanel({ token }) {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const fetchReviews = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/admin/reviews?page=${page}&limit=20`, authHeader)
      .then(r => { setReviews(r.data.data || []); setTotal(r.data.total || 0); })
      .catch(() => safeToastError('Failed to load reviews'))
      .finally(() => setLoading(false));
  }, [page, token]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const deleteReview = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    setDeleting(id);
    try {
      await axios.delete(`${API}/admin/reviews/${id}`, authHeader);
      toast.success('Review deleted');
      fetchReviews();
    } catch (e) {
      toast.error('Failed to delete review');
    } finally { setDeleting(null); }
  };

  return (
    <div>
      <SectionHeader title="Reviews & Moderation" sub="Moderate product reviews submitted by buyers" />
      <GlassCard className="p-6 border-black/[0.05]">
        {loading ? <Spinner /> : reviews.length === 0 ? <EmptyState message="No product reviews found." /> : (
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="bg-black/[0.02] border border-black/[0.06] rounded-[16px] p-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={13} className={i < r.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'} />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-secondary">for {r.product?.name}</span>
                  </div>
                  <p className="text-sm font-medium text-secondary">{r.comment || 'No comment text'}</p>
                  <p className="text-xs text-muted mt-1">By: {r.user?.firstName} {r.user?.lastName} · {fmtDate(r.createdAt)}</p>
                </div>
                <button onClick={() => deleteReview(r.id)} disabled={deleting === r.id}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-[8px] transition-colors disabled:opacity-50 shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <Pagination page={page} total={total} limit={20} onPage={setPage} />
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ─── Sidebar Navigation Tabs Configuration ─────────────────────────────────────
const TABS = [
  { id: 'dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'users',        icon: Users,           label: 'Users' },
  { id: 'sellers',      icon: Store,           label: 'Sellers' },
  { id: 'providers',    icon: Stethoscope,     label: 'Providers' },
  { id: 'products',     icon: Dog,             label: 'Products & Listings' },
  { id: 'orders',       icon: ShoppingBag,     label: 'Orders' },
  { id: 'appointments', icon: ClipboardList,   label: 'Appointments' },
  { id: 'adoptions',    icon: Heart,           label: 'Adoptions' },
  { id: 'disputes',     icon: Scale,           label: 'Disputes' },
  { id: 'payouts',      icon: Wallet,          label: 'Wallet & Payouts' },
  { id: 'finance',      icon: TrendingUp,      label: 'Platform Finance' },
  { id: 'reviews',      icon: Star,            label: 'Reviews & Reports' },
  { id: 'audit-logs',   icon: ScrollText,      label: 'Audit Logs' },
  { id: 'settings',     icon: Settings,        label: 'Settings' },
];

// ─── Main Admin Dashboard Container Component ─────────────────────────────────
export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { accessToken } = useSelector(state => state.auth);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab')) {
      setActiveTab(params.get('tab'));
    }
  }, [location]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    navigate(`/admin/dashboard?tab=${tabId}`, { replace: true });
  };

  const panelProps = { token: accessToken };

  return (
    <div className="bg-background min-h-screen pt-28 pb-32 font-sans">
      <div className="max-w-7xl mx-auto px-6 md:px-8 flex flex-col md:flex-row gap-10">
        
        {/* Sidebar Navigation (Matching Seller/Provider Dashboard Style) */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-4 md:gap-6 md:sticky md:top-32 h-fit">
          <div>
            <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-1">Admin Panel</h2>
            <p className="text-xs font-medium text-muted">Monitor and manage PawMart</p>
          </div>
          
          <nav className="flex flex-row overflow-x-auto md:flex-col gap-1.5 border-t border-black/[0.07] pt-4 md:pt-6 pb-2 md:pb-0 scrollbar-none max-h-[75vh] pr-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-[12px] text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 md:shrink transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-md'
                    : 'text-muted hover:bg-black/5 hover:text-primary bg-surface md:bg-transparent'
                }`}
              >
                <tab.icon size={16} />
                <span className="text-left">{tab.label}</span>
              </button>
            ))}
            
            <div className="hidden md:block h-px bg-black/[0.07] my-2" />
            
            <button
              onClick={() => {
                dispatch(clearCredentials());
                navigate('/');
              }}
              className="flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-[12px] text-xs sm:text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-600 whitespace-nowrap shrink-0 md:shrink transition-all bg-surface md:bg-transparent"
            >
              <LogOut size={16} />
              Logout
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow min-w-0">
          <ErrorBoundary>
            {activeTab === 'dashboard'    && <DashboardPanel {...panelProps} />}
            {activeTab === 'users'        && <UsersPanel {...panelProps} />}
            {activeTab === 'sellers'      && <VerificationPanel type="sellers" {...panelProps} />}
            {activeTab === 'providers'    && <VerificationPanel type="providers" {...panelProps} />}
            {activeTab === 'products'     && <ProductsPanel {...panelProps} />}
            {activeTab === 'orders'       && <OrdersPanel {...panelProps} />}
            {activeTab === 'appointments' && <AppointmentsPanel {...panelProps} />}
            {activeTab === 'adoptions'    && <AdoptionsPanel {...panelProps} />}
            {activeTab === 'disputes'     && <DisputesPanel {...panelProps} />}
            {activeTab === 'payouts'      && <PayoutsPanel {...panelProps} />}
            {activeTab === 'finance'      && <FinancePanel {...panelProps} />}
            {activeTab === 'settings'     && <SettingsPanel {...panelProps} />}
            {activeTab === 'audit-logs'   && <AuditLogsPanel {...panelProps} />}
            {activeTab === 'reviews'      && <ReviewsPanel {...panelProps} />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
