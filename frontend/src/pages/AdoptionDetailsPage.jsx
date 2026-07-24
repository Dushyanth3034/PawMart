import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, MapPin, Phone, Mail, Heart, CheckCircle2, AlertCircle } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard.jsx';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import { getFullImageUrl } from '../utils/imageHelper.js';

export default function AdoptionDetailsPage() {
  const { id } = useParams();
  const { accessToken } = useSelector((state) => state.auth);
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/adoptions/requests/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        setRequest(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (accessToken) {
      fetchDetails();
    }
  }, [id, accessToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6 text-center">
        <h2 className="text-3xl font-extrabold text-secondary mb-4">Request Not Found</h2>
        <p className="text-muted mb-8 max-w-md">The adoption request you are looking for does not exist or you do not have permission to view it.</p>
        <Link to="/dashboard/buyer?tab=adoptions">
          <PremiumButton variant="primary">Go to Dashboard</PremiumButton>
        </Link>
      </div>
    );
  }

  const { pet, status, preferredDate, preferredTime, reason, notes, rescheduleReason } = request;
  const provider = pet?.seller;
  const profile = provider?.providerProfile;

  // Timeline stage config
  const stages = [
    { key: 'PENDING', label: 'Request Submitted', desc: 'Your application has been received and is under review.' },
    { key: 'MEETING_SCHEDULED', label: 'Meeting Scheduled', desc: 'A meeting has been scheduled to meet the pet.' },
    { key: 'MEETING_COMPLETED', label: 'Meeting Completed', desc: 'The meeting was completed. The provider is making a decision.' },
    { key: 'APPROVED', label: 'Application Approved', desc: 'Congratulations! Your application has been approved.' },
    { key: 'VISIT_CENTER', label: 'Visit Adoption Center', desc: 'Please visit the adoption center to finalize.' },
    { key: 'COMPLETED', label: 'Adoption Completed', desc: 'The adoption process is fully completed. Enjoy your new companion!' }
  ];

  // Helper to determine stage state
  const getStageIndex = (currentStatus) => {
    if (currentStatus === 'REJECTED') return -1;
    if (currentStatus === 'CANCELLED') return -1;
    return stages.findIndex(s => s.key === currentStatus);
  };

  const currentStageIndex = getStageIndex(status);

  return (
    <div className="bg-background min-h-screen pt-32 pb-32">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        {/* Back Link */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard/buyer?tab=adoptions" className="w-10 h-10 rounded-full bg-surface flex items-center justify-center hover:bg-accent/20 transition-colors text-secondary border border-black/[0.05]">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold font-outfit text-secondary leading-tight">Adoption Tracker</h1>
            <p className="text-sm font-semibold text-muted">Track the application stages for {pet?.name}</p>
          </div>
        </div>

        {/* Timeline Progress Tracker */}
        <GlassCard className="p-8 mb-8 border-black/[0.04]">
          <h3 className="text-lg font-bold text-secondary mb-6 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-primary" /> Application Progress
          </h3>

          {status === 'REJECTED' ? (
            <div className="bg-red-50 border border-red-200 rounded-[20px] p-6 flex items-start gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-full"><AlertCircle size={24} /></div>
              <div>
                <h4 className="font-bold text-red-800 text-lg">Application Declined</h4>
                <p className="text-sm font-medium text-red-600 mt-1">Unfortunately, your application for adopting {pet?.name} was declined by the provider. Please feel free to check other available pets.</p>
              </div>
            </div>
          ) : status === 'CANCELLED' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-[20px] p-6 flex items-start gap-4">
              <div className="p-3 bg-gray-100 text-gray-500 rounded-full"><AlertCircle size={24} /></div>
              <div>
                <h4 className="font-bold text-gray-800 text-lg">Application Cancelled</h4>
                <p className="text-sm font-medium text-gray-500 mt-1">This adoption request has been cancelled.</p>
              </div>
            </div>
          ) : (
            <div className="relative pl-8 border-l border-black/10 space-y-8 py-2">
              {stages.map((stage, idx) => {
                const isCompleted = idx <= currentStageIndex;
                const isCurrent = idx === currentStageIndex;

                return (
                  <div key={stage.key} className="relative flex flex-col gap-1">
                    {/* Circle Bullet */}
                    <div className={`absolute left-[-41px] top-1.5 w-[18px] h-[18px] rounded-full border-4 ${
                      isCurrent ? 'bg-primary border-primary scale-125 ring-4 ring-primary/20 animate-pulse' :
                      isCompleted ? 'bg-green-500 border-green-500' :
                      'bg-white border-black/15'
                    }`} />

                    <h4 className={`font-bold font-outfit text-base ${isCurrent ? 'text-primary' : isCompleted ? 'text-secondary' : 'text-muted'}`}>
                      {stage.label}
                    </h4>
                    <p className="text-xs font-medium text-muted">{stage.desc}</p>
                    
                    {isCurrent && rescheduleReason && (
                      <div className="mt-2 text-xs bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold inline-block border border-red-100 max-w-md">
                        ⚠️ Provider rescheduled: "{rescheduleReason}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pet Details */}
          <GlassCard className="p-8 border-black/[0.04] space-y-6">
            <h3 className="text-lg font-bold text-secondary border-b border-black/5 pb-4 flex items-center gap-2">
              <Heart size={20} className="text-primary fill-primary" /> Pet Details
            </h3>
            
            {pet && (
              <div className="flex gap-4 items-start">
                {pet.images && pet.images.length > 0 && (
                  <img src={getFullImageUrl(pet.images[0].url)} alt={pet.name} className="w-24 h-24 rounded-2xl object-cover border border-black/5" />
                )}
                <div>
                  <h4 className="text-2xl font-extrabold text-secondary font-outfit">{pet.name}</h4>
                  <p className="text-sm font-bold text-primary uppercase mt-1">{pet.breed || 'Mixed Breed'}</p>
                  <p className="text-xs font-semibold text-muted mt-0.5">{pet.age} • {pet.gender}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm font-semibold">
              <div className="bg-surface p-3.5 rounded-xl border border-black/[0.03]">
                <span className="block text-[10px] text-muted uppercase font-extrabold tracking-wider">Health Status</span>
                <span className="text-secondary mt-1 block">{pet?.healthStatus || 'Healthy'}</span>
              </div>
              <div className="bg-surface p-3.5 rounded-xl border border-black/[0.03]">
                <span className="block text-[10px] text-muted uppercase font-extrabold tracking-wider">Vaccination Status</span>
                <span className="text-secondary mt-1 block">{pet?.vaccinationStatus?.replace(/_/g, ' ') || 'Vetted'}</span>
              </div>
              {pet?.medicalHistory && (
                <div className="col-span-2 bg-surface p-3.5 rounded-xl border border-black/[0.03]">
                  <span className="block text-[10px] text-muted uppercase font-extrabold tracking-wider">Medical Notes</span>
                  <p className="text-secondary mt-1 text-xs font-medium leading-relaxed">{pet.medicalHistory}</p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Meeting & Adoption Center Details */}
          <GlassCard className="p-8 border-black/[0.04] space-y-6">
            <h3 className="text-lg font-bold text-secondary border-b border-black/5 pb-4 flex items-center gap-2">
              <Calendar size={20} className="text-primary" /> Meeting & Adoption Center
            </h3>

            <div className="space-y-4">
              <div className="flex gap-3.5 items-start">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl mt-0.5"><Clock size={16} /></div>
                <div>
                  <h4 className="font-bold text-secondary text-sm">Meeting Appointment</h4>
                  <p className="text-xs font-semibold text-muted mt-1">
                    {new Date(preferredDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {preferredTime}
                  </p>
                </div>
              </div>

              {profile && (
                <>
                  <div className="flex gap-3.5 items-start">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl mt-0.5"><MapPin size={16} /></div>
                    <div>
                      <h4 className="font-bold text-secondary text-sm">{profile.clinicName || 'Adoption Center'}</h4>
                      <p className="text-xs font-medium text-muted mt-1 leading-relaxed">{profile.businessAddress}</p>
                      {profile.visitingHours && (
                        <span className="block text-[10px] font-bold text-primary uppercase mt-1">Hours: {profile.visitingHours}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3.5 items-start">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl mt-0.5"><Phone size={16} /></div>
                    <div>
                      <h4 className="font-bold text-secondary text-sm">Contact Number</h4>
                      <p className="text-xs font-semibold text-muted mt-1">{provider.phone || profile.storePhone || 'N/A'}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {notes && (
              <div className="bg-surface p-4 rounded-2xl border border-black/[0.03] mt-2">
                <span className="block text-[10px] text-muted uppercase font-extrabold tracking-wider">Your Application Notes</span>
                <p className="text-secondary mt-1.5 text-xs font-medium italic">"{notes}"</p>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
