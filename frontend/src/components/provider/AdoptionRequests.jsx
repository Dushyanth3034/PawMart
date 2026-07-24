import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { Calendar, User, Mail, Phone, Clock, FileText, CheckCircle2, XCircle, ArrowRightLeft } from 'lucide-react';
import GlassCard from '../ui/GlassCard.jsx';
import PremiumButton from '../ui/PremiumButton.jsx';
import MinimalInput from '../ui/MinimalInput.jsx';

export default function AdoptionRequests() {
  const { accessToken } = useSelector((state) => state.auth);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reschedule Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/provider/adoptions`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setRequests(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch adoption requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [accessToken]);

  const handleUpdateStatus = async (id, status, extra = {}) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/provider/adoptions/${id}/status`, {
        status,
        ...extra
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success(`Application status updated to ${status}`);
      fetchRequests();
    } catch (err) {
      toast.error('Failed to update request status');
    }
  };

  const openReschedule = (req) => {
    setSelectedRequest(req);
    setNewDate(req.preferredDate ? req.preferredDate.split('T')[0] : '');
    setNewTime(req.preferredTime || '');
    setRescheduleReason(req.rescheduleReason || '');
    setIsRescheduleOpen(true);
  };

  const handleRescheduleSubmit = (e) => {
    e.preventDefault();
    if (!newDate || !newTime || !rescheduleReason.trim()) {
      toast.error('Please fill in reschedule date, time and reason.');
      return;
    }
    handleUpdateStatus(selectedRequest.id, 'PENDING', {
      preferredDate: newDate,
      preferredTime: newTime,
      rescheduleReason
    });
    setIsRescheduleOpen(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="bg-yellow-50 text-yellow-600 px-2.5 py-1 rounded-full text-xs font-bold">Request Submitted</span>;
      case 'MEETING_SCHEDULED':
        return <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-xs font-bold">Meeting Scheduled</span>;
      case 'MEETING_COMPLETED':
        return <span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full text-xs font-bold">Meeting Completed</span>;
      case 'APPROVED':
        return <span className="bg-green-50 text-green-600 px-2.5 py-1 rounded-full text-xs font-bold">Application Approved</span>;
      case 'REJECTED':
        return <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-xs font-bold">Application Declined</span>;
      case 'VISIT_CENTER':
        return <span className="bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full text-xs font-bold">Visit Adoption Center</span>;
      case 'COMPLETED':
        return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-extrabold uppercase">Adoption Completed 🎉</span>;
      default:
        return <span className="bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Pet Adoption Applications</h2>
        <p className="text-sm text-gray-500">Screen pet adoption applicants, schedule meetups, and finalize adoptions.</p>
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
                  <th className="py-4 px-4 font-semibold text-gray-600">Applicant Details</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Requested Pet</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Proposed Meeting</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Status</th>
                  <th className="py-4 px-4 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length > 0 ? (
                  requests.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 text-sm">
                          <span className="font-semibold text-secondary flex items-center gap-1.5"><User size={14} className="text-primary"/> {r.fullName}</span>
                          <span className="text-gray-500 flex items-center gap-1.5"><Mail size={12}/> {r.email}</span>
                          <span className="text-gray-500 flex items-center gap-1.5"><Phone size={12}/> {r.phone}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-800">
                        {r.pet ? r.pet.name : 'Unknown Pet'}
                        {r.pet?.breed && <span className="block text-[10px] text-gray-500 font-bold uppercase">{r.pet.breed}</span>}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 text-xs font-semibold text-secondary">
                          <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(r.preferredDate).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Clock size={12}/> {r.preferredTime}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(r.status)}
                        {r.rescheduleReason && (
                          <span className="block text-[10px] text-red-500 font-bold max-w-xs mt-1">Reschedule: "{r.rescheduleReason}"</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {r.status === 'PENDING' && (
                            <>
                              <PremiumButton onClick={() => handleUpdateStatus(r.id, 'MEETING_SCHEDULED')} className="!py-1.5 !px-3 text-xs bg-green-500 hover:bg-green-600 text-white">
                                Accept Meeting
                              </PremiumButton>
                              <PremiumButton onClick={() => handleUpdateStatus(r.id, 'REJECTED')} className="!py-1.5 !px-3 text-xs bg-red-500 hover:bg-red-600 text-white">
                                Reject Meeting
                              </PremiumButton>
                              <PremiumButton onClick={() => openReschedule(r)} className="!py-1.5 !px-3 text-xs bg-gray-500 hover:bg-gray-600 text-white flex items-center gap-1">
                                <ArrowRightLeft size={12}/> Reschedule
                              </PremiumButton>
                            </>
                          )}
                          {r.status === 'MEETING_SCHEDULED' && (
                            <>
                              <PremiumButton onClick={() => handleUpdateStatus(r.id, 'MEETING_COMPLETED')} className="!py-1.5 !px-3 text-xs bg-indigo-500 hover:bg-indigo-600 text-white">
                                Mark Completed
                              </PremiumButton>
                              <PremiumButton onClick={() => openReschedule(r)} className="!py-1.5 !px-3 text-xs bg-gray-500 hover:bg-gray-600 text-white">
                                Reschedule
                              </PremiumButton>
                            </>
                          )}
                          {r.status === 'MEETING_COMPLETED' && (
                            <>
                              <PremiumButton onClick={() => handleUpdateStatus(r.id, 'APPROVED')} className="!py-1.5 !px-3 text-xs bg-green-500 hover:bg-green-600 text-white">
                                Approve Adoption
                              </PremiumButton>
                              <PremiumButton onClick={() => handleUpdateStatus(r.id, 'REJECTED')} className="!py-1.5 !px-3 text-xs bg-red-500 hover:bg-red-600 text-white">
                                Decline Adoption
                              </PremiumButton>
                            </>
                          )}
                          {r.status === 'APPROVED' && (
                            <PremiumButton onClick={() => handleUpdateStatus(r.id, 'VISIT_CENTER')} className="!py-1.5 !px-3 text-xs bg-orange-500 hover:bg-orange-600 text-white">
                              Invite to Center
                            </PremiumButton>
                          )}
                          {r.status === 'VISIT_CENTER' && (
                            <PremiumButton onClick={() => handleUpdateStatus(r.id, 'COMPLETED')} className="!py-1.5 !px-3 text-xs bg-green-600 hover:bg-green-700 text-white">
                              Complete Adoption
                            </PremiumButton>
                          )}
                          {r.status === 'COMPLETED' && (
                            <span className="text-xs text-muted font-bold flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500"/> Finalized</span>
                          )}
                          {r.status === 'REJECTED' && (
                            <span className="text-xs text-muted font-bold flex items-center gap-1"><XCircle size={12} className="text-red-500"/> Declined</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-gray-500">
                      No adoption applications received yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Reschedule Modal */}
      {isRescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <GlassCard className="bg-white p-6 max-w-md w-full relative">
            <h3 className="text-lg font-bold text-secondary mb-4">Reschedule Adoption Meeting</h3>
            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <MinimalInput required type="date" label="New Meeting Date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              <MinimalInput required type="time" label="New Meeting Time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">Reason for Rescheduling</label>
                <textarea
                  required
                  rows="3"
                  className="w-full bg-surface border border-black/[0.07] rounded-[12px] p-3 text-secondary font-medium outline-none focus:border-primary/50 transition-colors resize-none text-sm"
                  placeholder="e.g. Doctor is not available at this hour."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
                <PremiumButton type="button" variant="ghost" onClick={() => setIsRescheduleOpen(false)}>Cancel</PremiumButton>
                <PremiumButton type="submit">Submit Reschedule</PremiumButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
