import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Check, X, ShieldAlert, Search, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PremiumButton from '../ui/PremiumButton.jsx';
import MinimalInput from '../ui/MinimalInput.jsx';
import GlassCard from '../ui/GlassCard.jsx';

export default function BookingManagement() {
  const { accessToken } = useSelector((state) => state.auth);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Escrow Dispute Response States
  const [disputedBooking, setDisputedBooking] = useState(null);
  const [providerResponseText, setProviderResponseText] = useState('');
  const [showRespondDisputeModal, setShowRespondDisputeModal] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/provider/bookings`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setBookings(response.data.data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [accessToken]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/appointments/${id}`, { status }, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      const statusLabel = {
        ACCEPTED: 'accepted',
        CANCELLED: 'cancelled',
        COMPLETED: 'marked as completed'
      }[status] || status.toLowerCase();
      toast.success(`Booking ${statusLabel} successfully.`);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update booking status.');
    }
  };

  const handleCancel = async (booking) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel this appointment for ${booking.buyer?.firstName || 'this client'}?\n\nIf payment was held in escrow, it will be automatically refunded to the buyer.`
    );
    if (!confirmed) return;
    await handleUpdateStatus(booking.id, 'CANCELLED');
  };

  const handleRespondDispute = async (id, accept, explanation = '') => {
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/appointments/${id}/respond-dispute`, {
        accept,
        providerResponse: explanation
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success(accept ? 'Refund processed successfully' : 'Dispute sent to Admin for manual review');
      setShowRespondDisputeModal(false);
      setProviderResponseText('');
      setDisputedBooking(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit response');
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch =
      b.buyer ? `${b.buyer.firstName} ${b.buyer.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.service?.name?.toLowerCase().includes(searchTerm.toLowerCase()) : true;

    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Appointment &amp; Booking Requests</h2>
          <p className="text-sm text-gray-500">Track and manage client appointments along the service lifecycle.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <MinimalInput
            type="text"
            placeholder="Search bookings by client or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-14 px-5 rounded-[16px] bg-white border border-black/[0.07] font-medium text-secondary outline-none focus:border-primary transition-all"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="BOOKED">Booked</option>
          <option value="AWAITING_CUSTOMER_CONFIRMATION">Awaiting Confirmation</option>
          <option value="COMPLETED">Completed</option>
          <option value="DISPUTED">Disputed</option>
          <option value="REFUNDED">Refunded</option>
          <option value="ADMIN_REVIEW">Admin Review</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <GlassCard className="p-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-4 px-4 font-semibold text-gray-600">Customer Name</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Dog Name</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Appointment Date</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Session</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Payment Status</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Booking Status</th>
                  <th className="py-4 px-4 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((b) => {
                    const appDate = new Date(b.date);
                    let endHour = 13;
                    let endMinute = 0;
                    if (b.endTime && b.endTime.includes(':')) {
                      const parts = b.endTime.split(':');
                      endHour = parseInt(parts[0], 10);
                      endMinute = parseInt(parts[1], 10);
                    } else if (b.selectedSession === 'afternoon') {
                      endHour = 18;
                      endMinute = 0;
                    }
                    const appEndTime = new Date(appDate.getFullYear(), appDate.getMonth(), appDate.getDate(), endHour, endMinute);
                    const isPassed = new Date() > appEndTime;

                    return (
                      <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors text-sm">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                              {b.buyer?.firstName?.charAt(0) || <User size={16} />}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{b.buyer ? `${b.buyer.firstName} ${b.buyer.lastName}` : 'N/A'}</p>
                              <p className="text-xs text-gray-500 font-medium">{b.contactDetails || b.buyer?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-gray-800">{b.dogName || b.pet?.name || 'Dog'}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-gray-800">{new Date(b.date).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-500 font-medium">{b.startTime} - {b.endTime}</p>
                        </td>
                        <td className="py-4 px-4">
                          <span className="capitalize font-semibold text-gray-700">{b.selectedSession || 'N/A'}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            b.paymentStatus === 'RELEASED' ? 'bg-success/15 text-success' :
                            b.paymentStatus === 'HELD' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                            b.paymentStatus === 'ON_HOLD' ? 'bg-red-100 text-red-800' :
                            b.paymentStatus === 'REFUNDED' ? 'bg-red-50 text-red-500' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {b.paymentStatus || 'HELD'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            b.status === 'COMPLETED' ? 'bg-success/15 text-success' :
                            b.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                            b.status === 'BOOKED' ? 'bg-blue-100 text-blue-800' :
                            b.status === 'ACCEPTED' ? 'bg-indigo-100 text-indigo-800' :
                            b.status === 'AWAITING_CUSTOMER_CONFIRMATION' ? 'bg-amber-100 text-amber-800' :
                            b.status === 'DISPUTED' ? 'bg-rose-100 text-rose-700 font-extrabold' :
                            b.status === 'REFUNDED' ? 'bg-red-100 text-red-600' :
                            b.status === 'ADMIN_REVIEW' ? 'bg-purple-100 text-purple-700' :
                            b.status === 'CANCELLED' || b.status === 'REJECTED' ? 'bg-red-50 text-red-500' :
                            'bg-gray-50 text-gray-600'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">

                            {/* PENDING: Accept or Reject */}
                            {b.status === 'PENDING' && (
                              <>
                                <PremiumButton
                                  variant="primary"
                                  onClick={() => handleUpdateStatus(b.id, 'ACCEPTED')}
                                  className="!py-1.5 !px-3 text-xs flex items-center gap-1"
                                >
                                  <Check size={12} /> Accept
                                </PremiumButton>
                                <PremiumButton
                                  variant="ghost"
                                  onClick={() => handleCancel(b)}
                                  className="!py-1.5 !px-3 text-xs flex items-center gap-1 text-red-500"
                                >
                                  <X size={12} /> Cancel
                                </PremiumButton>
                              </>
                            )}

                            {/* ACCEPTED / CONFIRMED / BOOKED: Cancel or Mark Completed (time-gated) */}
                            {(b.status === 'ACCEPTED' || b.status === 'CONFIRMED' || b.status === 'BOOKED') && (
                              isPassed ? (
                                <div className="flex gap-1.5">
                                  <PremiumButton
                                    variant="primary"
                                    onClick={() => handleUpdateStatus(b.id, 'COMPLETED')}
                                    className="!py-1.5 !px-3 text-xs flex items-center gap-1"
                                  >
                                    <Check size={12} /> Mark Service Completed
                                  </PremiumButton>
                                  <PremiumButton
                                    variant="ghost"
                                    onClick={() => handleCancel(b)}
                                    className="!py-1.5 !px-3 text-xs flex items-center gap-1 text-red-500"
                                  >
                                    <X size={12} /> Cancel
                                  </PremiumButton>
                                </div>
                              ) : (
                                <div className="flex flex-col items-end gap-1.5">
                                  <span className="text-[10px] text-gray-500 font-medium italic max-w-[180px] text-right">
                                    Service Scheduled. Available after the appointment ends.
                                  </span>
                                  <div className="flex gap-1.5">
                                    <PremiumButton
                                      variant="primary"
                                      disabled={true}
                                      className="!py-1.5 !px-3 text-xs flex items-center gap-1 opacity-40 cursor-not-allowed"
                                    >
                                      <Check size={12} /> Mark Service Completed
                                    </PremiumButton>
                                    <PremiumButton
                                      variant="ghost"
                                      onClick={() => handleCancel(b)}
                                      className="!py-1.5 !px-3 text-xs flex items-center gap-1 text-red-500"
                                    >
                                      <X size={12} /> Cancel
                                    </PremiumButton>
                                  </div>
                                </div>
                              )
                            )}

                            {/* AWAITING CONFIRMATION: read-only state */}
                            {b.status === 'AWAITING_CUSTOMER_CONFIRMATION' && (
                              <span className="text-xs text-amber-600 font-bold flex items-center gap-1">⏳ Awaiting Customer Confirmation</span>
                            )}

                            {/* DISPUTED: Accept or Reject complaint */}
                            {b.status === 'DISPUTED' && (
                              <div className="flex gap-1.5">
                                <PremiumButton
                                  variant="primary"
                                  onClick={() => { if (window.confirm('Accept the customer complaint and refund the full amount?')) handleRespondDispute(b.id, true); }}
                                  className="!py-1 !px-2.5 text-[10px] flex items-center gap-1 !bg-success !border-none text-white"
                                >
                                  Accept Complaint
                                </PremiumButton>
                                <PremiumButton
                                  variant="ghost"
                                  onClick={() => { setDisputedBooking(b); setShowRespondDisputeModal(true); }}
                                  className="!py-1 !px-2.5 text-[10px] flex items-center gap-1 !text-red-500 border !border-red-500/20 hover:!bg-red-50"
                                >
                                  Reject Complaint
                                </PremiumButton>
                              </div>
                            )}

                            {/* ADMIN REVIEW */}
                            {b.status === 'ADMIN_REVIEW' && (
                              <span className="text-xs text-purple-600 font-bold">⚖️ Under Admin Review</span>
                            )}

                            {/* COMPLETED */}
                            {b.status === 'COMPLETED' && (
                              <span className="text-xs text-success font-bold flex items-center gap-1">
                                <Check size={14} /> Completed
                              </span>
                            )}

                            {/* REFUNDED */}
                            {b.status === 'REFUNDED' && (
                              <span className="text-xs text-red-500 font-bold">💸 Refunded</span>
                            )}

                            {/* CANCELLED / REJECTED */}
                            {(b.status === 'CANCELLED' || b.status === 'REJECTED') && (
                              <span className="text-xs text-red-400 font-bold">Closed</span>
                            )}

                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-500">
                      No appointment bookings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Respond to Dispute Modal */}
      {showRespondDisputeModal && disputedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] max-w-md w-full shadow-premium p-8 relative">
            <button
              onClick={() => {
                setShowRespondDisputeModal(false);
                setDisputedBooking(null);
                setProviderResponseText('');
              }}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold font-outfit text-secondary mb-6">Reject Customer Complaint</h3>

            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl mb-6 text-xs text-rose-800">
              <p className="font-bold mb-1">Customer reported issue:</p>
              <p className="italic">"{disputedBooking.disputeReason}"</p>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Please provide your explanation for rejecting this complaint. This information will be sent directly to the Admin for manual arbitration.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRespondDispute(disputedBooking.id, false, providerResponseText);
              }}
              className="space-y-4"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted uppercase tracking-wider">Your explanation</label>
                <textarea
                  required
                  rows="4"
                  placeholder="e.g. The customer missed their appointment time without notifying us, we waited for 45 minutes."
                  value={providerResponseText}
                  onChange={(e) => setProviderResponseText(e.target.value)}
                  className="w-full p-4 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <PremiumButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowRespondDisputeModal(false);
                    setDisputedBooking(null);
                    setProviderResponseText('');
                  }}
                >
                  Cancel
                </PremiumButton>
                <PremiumButton type="submit" variant="primary">
                  Escalate to Admin
                </PremiumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
