import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Store, Save, FileImage } from 'lucide-react';
import PremiumButton from '../ui/PremiumButton.jsx';
import MinimalInput from '../ui/MinimalInput.jsx';
import GlassCard from '../ui/GlassCard.jsx';
import ImageUpload from '../ui/ImageUpload.jsx';

export default function SellerProfileManager() {
  const { accessToken } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/seller/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setProfile(res.data.data);
      setLoading(false);
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to load store profile.' });
      setLoading(false);
    }
  };

  const handleImageUpload = async (formData) => {
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/seller/profile/upload`, formData, {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'multipart/form-data'
      },
      withCredentials: true
    });
    return res.data.data.imagePath;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/seller/profile`, profile, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setProfile(res.data.data);
      setMsg({ type: 'success', text: 'Store profile updated successfully.' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to update store profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-muted">Loading profile...</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-2">Store Profile</h2>
        <p className="text-muted text-sm">Manage your store's public appearance and business details.</p>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl font-bold text-sm ${msg.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        <GlassCard className="p-8 border-black/[0.07]">
          <h3 className="text-lg font-bold text-secondary mb-6 flex items-center gap-2">
            <Store size={20} className="text-primary" /> Basic Information
          </h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MinimalInput 
                label="Store Name" 
                value={profile?.storeName || ''} 
                onChange={(e) => setProfile({...profile, storeName: e.target.value})}
                required
              />
              <MinimalInput 
                label="GST Number / Tax ID" 
                value={profile?.gstNumber || ''} 
                onChange={(e) => setProfile({...profile, gstNumber: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2 ml-1">Store Description</label>
              <textarea 
                className="w-full bg-surface border border-black/[0.07] rounded-[16px] p-4 text-secondary font-medium outline-none focus:border-primary/50 transition-colors resize-none"
                rows="4"
                value={profile?.storeDescription || ''}
                onChange={(e) => setProfile({...profile, storeDescription: e.target.value})}
                placeholder="Tell customers about your brand..."
              ></textarea>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-8 border-black/[0.07]">
          <h3 className="text-lg font-bold text-secondary mb-6 flex items-center gap-2"><FileImage className="text-primary" size={20} /> Store Media</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ImageUpload 
              label="Store Logo"
              type="logo"
              aspectRatio="square"
              value={profile?.storeLogo || ''}
              onChange={(url) => setProfile({...profile, storeLogo: url})}
              onUpload={handleImageUpload}
              className="max-w-[200px]"
            />
            
            <ImageUpload 
              label="Store Banner"
              type="banner"
              aspectRatio="banner"
              value={profile?.storeBanner || ''}
              onChange={(url) => setProfile({...profile, storeBanner: url})}
              onUpload={handleImageUpload}
            />
          </div>
        </GlassCard>

        <GlassCard className="p-8 border-black/[0.07]">
          <h3 className="text-lg font-bold text-secondary mb-6">Contact & Social</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MinimalInput label="Contact Number" value={profile?.contactNumber || ''} onChange={(e) => setProfile({...profile, contactNumber: e.target.value})} />
            <MinimalInput label="Website" value={profile?.website || ''} onChange={(e) => setProfile({...profile, website: e.target.value})} />
            <MinimalInput label="Facebook" value={profile?.facebook || ''} onChange={(e) => setProfile({...profile, facebook: e.target.value})} />
            <MinimalInput label="Instagram" value={profile?.instagram || ''} onChange={(e) => setProfile({...profile, instagram: e.target.value})} />
          </div>
        </GlassCard>

        <div className="flex justify-end">
          <PremiumButton type="submit" variant="primary" disabled={saving} className="!px-8">
            {saving ? 'Saving...' : <><Save size={18} /> Save Store Profile</>}
          </PremiumButton>
        </div>
      </form>
    </div>
  );
}
