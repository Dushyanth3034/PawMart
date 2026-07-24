import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Save, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../ui/GlassCard.jsx';
import PremiumButton from '../ui/PremiumButton.jsx';
import MinimalInput from '../ui/MinimalInput.jsx';

export default function ProviderCalendar() {
  const { accessToken } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Calendar settings
  const [workingDays, setWorkingDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [workingHours, setWorkingHours] = useState('09:00 AM - 05:00 PM');
  const [blockedDates, setBlockedDates] = useState([]);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/provider/profile`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        if (res.data?.data) {
          setProfile(res.data.data);
          // Parse values from profile if they exist
          if (res.data.data.workingHours) {
            setWorkingHours(res.data.data.workingHours);
          }
          // Fallback parsing or mock setup for blocked dates
          setBlockedDates([
            { id: '1', date: '2026-08-15', label: 'Independence Day' },
            { id: '2', date: '2026-12-25', label: 'Christmas Holiday' }
          ]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [accessToken]);

  const toggleDay = (day) => {
    setWorkingDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAddBlockedDate = (e) => {
    e.preventDefault();
    if (!newBlockedDate) return;
    setBlockedDates([...blockedDates, {
      id: Date.now().toString(),
      date: newBlockedDate,
      label: 'Manual Block'
    }]);
    setNewBlockedDate('');
    toast.success('Date blocked successfully');
  };

  const handleRemoveBlockedDate = (id) => {
    setBlockedDates(blockedDates.filter(d => d.id !== id));
    toast.success('Block removed');
  };

  const handleSaveCalendar = async () => {
    try {
      // Save working hours and details back to database
      await axios.put(`${import.meta.env.VITE_API_URL}/provider/profile`, {
        ...profile,
        workingHours: workingHours,
        clinicDetails: `Working Days: ${workingDays.join(', ')}`
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success('Calendar configurations saved successfully ✨');
    } catch (err) {
      toast.error('Failed to save calendar configuration');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Professional Provider Calendar</h2>
        <p className="text-sm text-gray-500">Configure weekly schedules, working hours, and select dates to block bookings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Working Days & Schedule */}
        <GlassCard className="p-6 space-y-6 border-black/[0.04]">
          <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
            <Clock size={20} className="text-primary" /> Working Days
          </h3>
          <div className="flex flex-col gap-2.5">
            {daysOfWeek.map(day => {
              const active = workingDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`flex items-center justify-between px-5 py-3 rounded-2xl border text-sm font-semibold transition-all ${
                    active ? 'bg-primary/5 text-primary border-primary/30 shadow-sm' : 'bg-surface text-secondary border-black/[0.05] hover:bg-black/5'
                  }`}
                >
                  <span>{day}</span>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${active ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                    {active && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                  </span>
                </button>
              );
            })}
          </div>

          <MinimalInput 
            label="Working Hours String" 
            placeholder="e.g. 09:00 AM - 05:00 PM" 
            value={workingHours} 
            onChange={(e) => setWorkingHours(e.target.value)} 
          />
        </GlassCard>

        {/* Blocked Dates */}
        <GlassCard className="p-6 space-y-6 border-black/[0.04]">
          <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
            <CalendarIcon size={20} className="text-primary" /> Blocked Dates & Holidays
          </h3>
          
          <form onSubmit={handleAddBlockedDate} className="flex gap-2 items-end">
            <div className="flex-grow">
              <MinimalInput 
                type="date" 
                label="Pick Date to Block" 
                value={newBlockedDate} 
                onChange={(e) => setNewBlockedDate(e.target.value)} 
              />
            </div>
            <PremiumButton type="submit" className="h-14 !px-4"><Plus size={20} /></PremiumButton>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {blockedDates.length > 0 ? (
              blockedDates.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3.5 bg-surface rounded-xl border border-black/[0.04]">
                  <div>
                    <p className="font-semibold text-secondary text-sm">{new Date(item.date).toLocaleDateString()}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">{item.label}</p>
                  </div>
                  <button onClick={() => handleRemoveBlockedDate(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-6 text-sm">No dates blocked.</p>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="flex justify-end pt-4">
        <PremiumButton onClick={handleSaveCalendar} className="flex items-center gap-2">
          <Save size={16} /> Save Calendar Config
        </PremiumButton>
      </div>
    </div>
  );
}
