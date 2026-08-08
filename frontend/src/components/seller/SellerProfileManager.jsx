import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Store, Save, FileImage, Plus, Edit2, Trash2, Tag, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PremiumButton from '../ui/PremiumButton.jsx';
import MinimalInput from '../ui/MinimalInput.jsx';
import GlassCard from '../ui/GlassCard.jsx';
import ImageUpload from '../ui/ImageUpload.jsx';
import { getFullImageUrl } from '../../utils/imageHelper.js';

export default function SellerProfileManager() {
  const { accessToken } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState(null);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Brand Modal State
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandForm, setBrandForm] = useState({ name: '', logoUrl: '' });
  const [brandSubmitting, setBrandSubmitting] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchBrands();
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

  const fetchBrands = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/seller/brands`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setBrands(res.data.data || []);
    } catch (err) {
      console.error('Failed to load brands:', err);
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
      toast.success('Store profile updated successfully.');
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to update store profile.' });
      toast.error('Failed to update store profile.');
    } finally {
      setSaving(false);
    }
  };

  // Brand Management Handlers
  const handleOpenAddBrand = () => {
    setEditingBrand(null);
    setBrandForm({ name: '', logoUrl: '' });
    setIsBrandModalOpen(true);
  };

  const handleOpenEditBrand = (brand) => {
    setEditingBrand(brand);
    setBrandForm({ name: brand.name, logoUrl: brand.logoUrl });
    setIsBrandModalOpen(true);
  };

  const handleSaveBrand = async (e) => {
    e.preventDefault();
    if (!brandForm.name.trim()) {
      toast.error('Please enter a brand name.');
      return;
    }
    if (!brandForm.logoUrl) {
      toast.error('Please upload a brand logo.');
      return;
    }

    setBrandSubmitting(true);
    try {
      if (editingBrand) {
        await axios.put(`${import.meta.env.VITE_API_URL}/seller/brands/${editingBrand.id}`, brandForm, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        toast.success('Brand updated successfully.');
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/seller/brands`, brandForm, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        toast.success('Brand added successfully.');
      }
      setIsBrandModalOpen(false);
      fetchBrands();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save brand.');
    } finally {
      setBrandSubmitting(false);
    }
  };

  const handleDeleteBrand = async (brandId, brandName) => {
    if (!window.confirm(`Remove "${brandName}" from your store profile?\n\nNote: Products belonging to this brand will NOT be deleted.`)) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/seller/brands/${brandId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success('Brand removed successfully.');
      fetchBrands();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove brand.');
    }
  };

  if (loading) return <div className="text-muted">Loading profile...</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-2">Store Profile</h2>
        <p className="text-muted text-sm">Manage your store's public appearance, business details, and official brands.</p>
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
                placeholder="Tell customers about your store and authorized brands..."
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

        {/* Brands We Sell Section */}
        <GlassCard className="p-8 border-black/[0.07]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
                <Tag size={20} className="text-primary" /> Brands We Sell
              </h3>
              <p className="text-xs text-muted font-medium mt-1">
                Showcase the official brands & manufacturers available in your store. Add at least 8 brands to build customer trust.
              </p>
            </div>
            <PremiumButton
              type="button"
              variant="secondary"
              onClick={handleOpenAddBrand}
              className="!py-2 !px-4 text-xs font-bold shrink-0 flex items-center gap-1.5"
            >
              <Plus size={16} /> Add Brand
            </PremiumButton>
          </div>

          {brands.length === 0 ? (
            <div className="bg-surface border border-dashed border-black/15 rounded-[20px] p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <Tag size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-secondary">No Brands Added Yet</p>
                <p className="text-xs text-muted max-w-sm mx-auto mt-1">
                  Add the popular pet food, accessory, or healthcare brands your store carries to attract more buyers.
                </p>
              </div>
              <PremiumButton
                type="button"
                variant="primary"
                onClick={handleOpenAddBrand}
                className="!py-2 !px-4 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> Add Your First Brand
              </PremiumButton>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {brands.map((b) => (
                <div 
                  key={b.id} 
                  className="group relative bg-surface border border-black/[0.07] rounded-2xl p-4 flex flex-col items-center justify-between text-center hover:border-primary/40 hover:shadow-md transition-all duration-300"
                >
                  <div className="w-full h-20 bg-white rounded-xl border border-black/[0.04] p-2 flex items-center justify-center overflow-hidden mb-3">
                    <img 
                      src={getFullImageUrl(b.logoUrl)} 
                      alt={b.name} 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <p className="text-xs font-extrabold text-secondary truncate w-full px-1 mb-2" title={b.name}>
                    {b.name}
                  </p>
                  
                  <div className="flex items-center justify-center gap-2 w-full pt-2 border-t border-black/[0.05]">
                    <button
                      type="button"
                      onClick={() => handleOpenEditBrand(b)}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                      title="Edit Brand"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBrand(b.id, b.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Remove Brand"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <div className="flex justify-end">
          <PremiumButton type="submit" variant="primary" disabled={saving} className="!px-8">
            {saving ? 'Saving...' : <><Save size={18} /> Save Store Profile</>}
          </PremiumButton>
        </div>
      </form>

      {/* Add / Edit Brand Modal */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] max-w-md w-full shadow-premium p-6 md:p-8 relative">
            <button
              type="button"
              onClick={() => setIsBrandModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold font-outfit text-secondary mb-2">
              {editingBrand ? 'Edit Brand' : 'Add Brand'}
            </h3>
            <p className="text-xs text-muted mb-6">
              {editingBrand ? 'Update the brand details and logo.' : 'Showcase an official brand available in your store.'}
            </p>

            <form onSubmit={handleSaveBrand} className="space-y-6">
              <MinimalInput
                label="Brand Name"
                placeholder="e.g. Royal Canin, Pedigree, Drools"
                value={brandForm.name}
                onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                required
              />

              <div className="space-y-2">
                <label className="block text-xs font-bold text-muted uppercase tracking-wider ml-1">Brand Logo</label>
                <ImageUpload
                  label="Upload Brand Logo"
                  type="logo"
                  aspectRatio="square"
                  value={brandForm.logoUrl}
                  onChange={(url) => setBrandForm({ ...brandForm, logoUrl: url })}
                  onUpload={handleImageUpload}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
                <PremiumButton
                  type="button"
                  variant="ghost"
                  onClick={() => setIsBrandModalOpen(false)}
                >
                  Cancel
                </PremiumButton>
                <PremiumButton
                  type="submit"
                  variant="primary"
                  disabled={brandSubmitting}
                >
                  {brandSubmitting ? 'Saving...' : editingBrand ? 'Update Brand' : 'Add Brand'}
                </PremiumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
