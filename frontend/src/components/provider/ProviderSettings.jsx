import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Save, FileImage, Settings, Clock, CreditCard, Activity, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PremiumButton from '../ui/PremiumButton.jsx';
import MinimalInput from '../ui/MinimalInput.jsx';
import GlassCard from '../ui/GlassCard.jsx';
import ImageUpload from '../ui/ImageUpload.jsx';

export default function ProviderSettings() {
  const { accessToken, user } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState({
    businessName: '',
    description: '',
    contactNumber: '',
    website: '',
    facebook: '',
    instagram: '',
    linkedin: '',
    clinicDetails: '',
    workingHours: '9:00 AM - 5:00 PM',
    businessAddress: '',
    gstNumber: '',
    experience: '',
    licenseNumber: '',
    bankDetails: '',
    emergencyContact: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/provider/profile`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        if (response.data?.data) {
          setProfile(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching settings profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [accessToken]);

  const handleImageUpload = async (formData) => {
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/provider/profile/upload`, formData, {
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
    try {
      setSaving(true);
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/provider/profile`, profile, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      if (res.data?.data) {
        setProfile(res.data.data);
      }
      toast.success('Provider settings updated successfully ✨');
    } catch (err) {
      toast.error('Failed to update provider settings');
    } finally {
      setSaving(false);
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
    <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Clinic & Business Settings</h2>
        <p className="text-sm text-gray-500">Configure clinic hours, emergency contacts, licensing credentials, and banking channels.</p>
      </div>

      {/* 1. Basic Biz Details */}
      <GlassCard className="p-8 border-black/[0.07]">
        <h3 className="text-lg font-bold text-secondary mb-6 flex items-center gap-2">
          <Settings size={20} className="text-primary" /> Basic Information
        </h3>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MinimalInput 
              required
              label="Business / Clinic Name" 
              value={profile.businessName || ''} 
              onChange={(e) => setProfile({...profile, businessName: e.target.value})}
            />
            <MinimalInput 
              label="GST Number / Tax ID" 
              value={profile.gstNumber || ''} 
              onChange={(e) => setProfile({...profile, gstNumber: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2 ml-1">Clinic Description</label>
            <textarea 
              className="w-full bg-surface border border-black/[0.07] rounded-[16px] p-4 text-secondary font-medium outline-none focus:border-primary/50 transition-colors resize-none"
              rows="4"
              value={profile.description || ''}
              onChange={(e) => setProfile({...profile, description: e.target.value})}
              placeholder="Tell customers about your pet care services..."
            />
          </div>
        </div>
      </GlassCard>

      {/* 2. Media Branding */}
      <GlassCard className="p-8 border-black/[0.07]">
        <h3 className="text-lg font-bold text-secondary mb-6 flex items-center gap-2">
          <FileImage className="text-primary" size={20} /> Clinic Branding
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ImageUpload 
            label="Clinic Logo / Photo"
            type="logo"
            aspectRatio="square"
            value={profile.storeLogo || ''}
            onChange={(logoUrl) => setProfile({...profile, storeLogo: logoUrl})}
            onUpload={handleImageUpload}
          />
          <ImageUpload 
            label="Store Banner"
            type="banner"
            aspectRatio="banner"
            value={profile.storeBanner || ''}
            onChange={(bannerUrl) => setProfile({...profile, storeBanner: bannerUrl})}
            onUpload={handleImageUpload}
          />
        </div>
      </GlassCard>

      {/* 3. Credentials & Logistics */}
      <GlassCard className="p-8 border-black/[0.07]">
        <h3 className="text-lg font-bold text-secondary mb-6 flex items-center gap-2">
          <Activity className="text-primary" size={20} /> Experience & Licensing
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MinimalInput 
            type="number"
            label="Years of Experience" 
            placeholder="5"
            value={profile.experience || ''} 
            onChange={(e) => setProfile({...profile, experience: e.target.value})}
          />
          <MinimalInput 
            label="License Number" 
            placeholder="LIC-9012"
            value={profile.licenseNumber || ''} 
            onChange={(e) => setProfile({...profile, licenseNumber: e.target.value})}
          />
          <MinimalInput 
            label="Clinic Working Hours" 
            placeholder="e.g. 9:00 AM - 5:00 PM"
            value={profile.workingHours || ''} 
            onChange={(e) => setProfile({...profile, workingHours: e.target.value})}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <MinimalInput 
            label="Emergency Contact Number" 
            placeholder="e.g. +91 99999 99999"
            value={profile.emergencyContact || ''} 
            onChange={(e) => setProfile({...profile, emergencyContact: e.target.value})}
          />
          <MinimalInput 
            label="Clinic Office Location Address" 
            placeholder="e.g. Indiranagar, Bangalore"
            value={profile.businessAddress || ''} 
            onChange={(e) => setProfile({...profile, businessAddress: e.target.value})}
          />
        </div>
      </GlassCard>

      {/* 4. Bank Account Routing Details */}
      <GlassCard className="p-8 border-black/[0.07]">
        <h3 className="text-lg font-bold text-secondary mb-6 flex items-center gap-2">
          <CreditCard className="text-primary" size={20} /> Settlement Bank Account Info
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MinimalInput 
            label="Bank Name, IFSC and A/C Number" 
            placeholder="SBI A/C: 1234567890, IFSC: SBIN0001"
            value={profile.bankDetails || ''} 
            onChange={(e) => setProfile({...profile, bankDetails: e.target.value})}
          />
          <MinimalInput 
            label="Store Contact Phone Number" 
            placeholder="+91 98765 43210"
            value={profile.contactNumber || ''} 
            onChange={(e) => setProfile({...profile, contactNumber: e.target.value})}
          />
          <MinimalInput 
            label="Official Website URL" 
            placeholder="https://myclinic.com"
            value={profile.website || ''} 
            onChange={(e) => setProfile({...profile, website: e.target.value})}
          />
        </div>
      </GlassCard>

      <div className="flex justify-end pt-4">
        <PremiumButton type="submit" disabled={saving} className="flex items-center gap-2">
          <Save size={16} />
          {saving ? 'Saving Changes...' : 'Save Settings'}
        </PremiumButton>
      </div>
    </form>
  );
}
