import React, { useState, useEffect } from 'react';
import { Settings, Shield, BellRing, User, Save, X, Eye, EyeOff } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { fetchProfile } from '../../redux/authSlice';
import GlassCard from '../ui/GlassCard.jsx';
import PremiumButton from '../ui/PremiumButton.jsx';
import MinimalInput from '../ui/MinimalInput.jsx';

export default function SettingsTab() {
  const { user, accessToken } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    storeName: '',
    storeDescription: '',
    storeCategory: '',
    businessAddress: '',
    gstNumber: ''
  });

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/seller/profile`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        const storeData = res.data.data;
        
        setProfileForm({
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          phone: user?.phone || '',
          storeName: storeData?.storeName || '',
          storeDescription: storeData?.storeDescription || '',
          storeCategory: storeData?.storeCategory || '',
          businessAddress: storeData?.businessAddress || '',
          gstNumber: storeData?.gstNumber || ''
        });
      } catch (err) {
        console.error("Failed to load profile details for edit");
      }
    };
    if (user && isEditingProfile) loadProfile();
  }, [user, isEditingProfile, accessToken]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/seller/profile`, profileForm, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success('Profile updated successfully!');
      dispatch(fetchProfile()); // Instantly updates global user state
      setIsEditingProfile(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      return toast.error('Current password and new password cannot be the same.');
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    if (passwordForm.newPassword.length < 8) {
      return toast.error('New password must be at least 8 characters');
    }

    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/auth/password/change`, passwordForm, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success('Password changed successfully!');
      setIsChangingPassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-2">Settings</h2>
        <p className="text-muted text-sm">Manage your account settings, security, and notification preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Account Profile Section */}
        <GlassCard hoverEffect={false} className="p-6 border-black/[0.07]">
          {!isEditingProfile ? (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <User size={20} />
              </div>
              <div className="flex-grow">
                <h3 className="font-bold text-secondary text-lg">Account Profile</h3>
                <p className="text-sm text-muted mt-1 mb-4">Update your email, phone number, and personal details.</p>
                <PremiumButton onClick={() => setIsEditingProfile(true)} variant="secondary" className="!px-4 !py-2 text-sm">Edit Profile</PremiumButton>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-black/[0.07] pb-4">
                <h3 className="font-bold text-secondary text-lg flex items-center gap-2">
                  <User size={20} className="text-primary" /> Edit Profile
                </h3>
                <button onClick={() => setIsEditingProfile(false)} className="p-2 text-muted hover:text-red-500 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <MinimalInput label="First Name" value={profileForm.firstName} onChange={(e) => setProfileForm({...profileForm, firstName: e.target.value})} required />
                  <MinimalInput label="Last Name" value={profileForm.lastName} onChange={(e) => setProfileForm({...profileForm, lastName: e.target.value})} required />
                  <MinimalInput label="Email Address (Read-only)" value={user?.email || ''} readOnly disabled />
                  <MinimalInput label="Mobile Number" value={profileForm.phone} onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})} />
                </div>
                
                <h4 className="font-bold text-secondary mt-6 border-b border-black/[0.07] pb-2">Business Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <MinimalInput label="Store Name" value={profileForm.storeName} onChange={(e) => setProfileForm({...profileForm, storeName: e.target.value})} required />
                  <MinimalInput label="Store Category" value={profileForm.storeCategory} onChange={(e) => setProfileForm({...profileForm, storeCategory: e.target.value})} />
                  <MinimalInput label="GST Number" value={profileForm.gstNumber} onChange={(e) => setProfileForm({...profileForm, gstNumber: e.target.value})} />
                  <MinimalInput label="Business Address" value={profileForm.businessAddress} onChange={(e) => setProfileForm({...profileForm, businessAddress: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2 ml-1">Store Description</label>
                  <textarea 
                    className="w-full bg-surface border border-black/[0.07] rounded-xl px-4 py-3 text-sm font-medium text-secondary focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px] resize-none"
                    value={profileForm.storeDescription}
                    onChange={(e) => setProfileForm({...profileForm, storeDescription: e.target.value})}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-black/[0.07]">
                  <PremiumButton type="button" onClick={() => setIsEditingProfile(false)} variant="ghost" className="!px-6">Cancel</PremiumButton>
                  <PremiumButton type="submit" variant="primary" className="!px-6"><Save size={16} className="mr-2" /> Save Changes</PremiumButton>
                </div>
              </form>
            </div>
          )}
        </GlassCard>

        {/* Security & Password Section */}
        <GlassCard hoverEffect={false} className="p-6 border-black/[0.07]">
          {!isChangingPassword ? (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center shrink-0">
                <Shield size={20} />
              </div>
              <div className="flex-grow">
                <h3 className="font-bold text-secondary text-lg">Security & Password</h3>
                <p className="text-sm text-muted mt-1 mb-4">Change your password to keep your account secure.</p>
                <PremiumButton onClick={() => setIsChangingPassword(true)} variant="secondary" className="!px-4 !py-2 text-sm">Change Password</PremiumButton>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-black/[0.07] pb-4">
                <h3 className="font-bold text-secondary text-lg flex items-center gap-2">
                  <Shield size={20} className="text-error" /> Change Password
                </h3>
                <button onClick={() => setIsChangingPassword(false)} className="p-2 text-muted hover:text-red-500 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="space-y-4 max-w-md">
                  <MinimalInput 
                    type={showPassword ? "text" : "password"} 
                    label="Current Password" 
                    value={passwordForm.currentPassword} 
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})} 
                    required 
                  />
                  <MinimalInput 
                    type={showPassword ? "text" : "password"} 
                    label="New Password" 
                    value={passwordForm.newPassword} 
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} 
                    required 
                  />
                  <MinimalInput 
                    type={showPassword ? "text" : "password"} 
                    label="Confirm New Password" 
                    value={passwordForm.confirmPassword} 
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} 
                    required 
                  />
                  
                  <label className="flex items-center gap-2 cursor-pointer mt-2 text-sm text-muted hover:text-secondary transition-colors w-fit">
                    <input type="checkbox" checked={showPassword} onChange={() => setShowPassword(!showPassword)} className="w-4 h-4 rounded-[4px] border-black/[0.07] text-primary focus:ring-primary accent-primary" />
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    <span className="font-medium">Show Passwords</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-black/[0.07]">
                  <PremiumButton type="button" onClick={() => setIsChangingPassword(false)} variant="ghost" className="!px-6">Cancel</PremiumButton>
                  <PremiumButton type="submit" variant="primary" className="!px-6"><Save size={16} className="mr-2" /> Update Password</PremiumButton>
                </div>
              </form>
            </div>
          )}
        </GlassCard>

        {/* Notification Preferences Section */}
        <GlassCard hoverEffect={false} className="p-6 border-black/[0.07]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0">
              <BellRing size={20} />
            </div>
            <div className="flex-grow">
              <h3 className="font-bold text-secondary text-lg">Notification Preferences</h3>
              <p className="text-sm text-muted mt-1 mb-4">Control what alerts you receive via email and dashboard.</p>
              
              <div className="space-y-3">
                {['Order Updates', 'Low Stock Alerts', 'New Reviews', 'Payout Confirmations'].map((pref, i) => (
                  <label key={i} className="flex items-center gap-3 cursor-pointer group w-fit">
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded-[6px] border-black/[0.07] text-primary focus:ring-primary accent-primary" />
                    <span className="text-secondary font-medium group-hover:text-primary transition-colors">{pref}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
