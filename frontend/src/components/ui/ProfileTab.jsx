import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateProfile, uploadAvatar, fetchProfile } from '../../redux/authSlice.js';
import MinimalInput from './MinimalInput.jsx';
import PremiumButton from './PremiumButton.jsx';
import GlassCard from './GlassCard.jsx';
import { Camera, Save } from 'lucide-react';

export default function ProfileTab() {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    dob: user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
    gender: user?.gender || '',
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });
    try {
      await dispatch(updateProfile(formData)).unwrap();
      await dispatch(fetchProfile());
      setMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setMsg({ type: 'error', text: err || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    setMsg({ type: '', text: '' });
    try {
      await dispatch(uploadAvatar(file)).unwrap();
      await dispatch(fetchProfile());
      setMsg({ type: 'success', text: 'Profile picture updated.' });
    } catch (err) {
      setMsg({ type: 'error', text: err || 'Failed to upload image.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <h3 className="text-2xl font-extrabold font-outfit text-secondary">My Profile</h3>
      
      {msg.text && (
        <div className={`p-4 rounded-[12px] text-sm font-bold ${msg.type === 'error' ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
          {msg.text}
        </div>
      )}

      <GlassCard hoverEffect={false} className="p-8 !bg-surface border-black/[0.07] flex flex-col md:flex-row gap-8 items-center md:items-start">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-white flex items-center justify-center shrink-0">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-extrabold text-primary font-outfit">{user?.firstName?.charAt(0) || 'U'}</span>
            )}
            
            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="text-white" size={28} />
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
          <p className="text-xs font-bold text-muted text-center max-w-[150px]">Click image to upload new avatar</p>
        </div>

        <form onSubmit={handleUpdate} className="flex-1 flex flex-col gap-6 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MinimalInput required label="First Name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
            <MinimalInput required label="Last Name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
            <MinimalInput label="Email (Read Only)" value={user?.email || ''} readOnly className="opacity-70 pointer-events-none col-span-1 md:col-span-2" />
            <MinimalInput label="Mobile Number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            <MinimalInput type="date" label="Date of Birth" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} />
            <div className="col-span-1 md:col-span-2 flex flex-col gap-2 relative">
              <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">Gender</label>
              <select 
                value={formData.gender} 
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                className="w-full h-14 px-5 text-sm font-bold bg-white border border-black/10 rounded-[20px] focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-secondary appearance-none"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>
          <PremiumButton type="submit" variant="primary" className="self-end !px-8 mt-4" disabled={loading}>
            {loading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
          </PremiumButton>
        </form>
      </GlassCard>
    </div>
  );
}
