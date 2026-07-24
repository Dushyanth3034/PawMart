import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Search, Image as ImageIcon, UploadCloud, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PremiumButton from '../ui/PremiumButton.jsx';
import MinimalInput from '../ui/MinimalInput.jsx';
import GlassCard from '../ui/GlassCard.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { getFullImageUrl } from '../../utils/imageHelper.js';

export default function PetManagement() {
  const { accessToken } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [editingPet, setEditingPet] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    categoryId: '',
    gender: 'MALE',
    age: '',
    weight: '',
    color: '',
    vaccinationStatus: 'PARTIALLY_VACCINATED',
    healthStatus: 'HEALTHY',
    medicalHistory: '',
    microchipNumber: '',
    listingType: 'SALE',
    price: '',
    discountPercent: '',
    gst: '',
    description: '',
    shortDescription: '',
    location: '',
    status: 'ACTIVE',
    images: []
  });

  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/provider/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setProfile(response.data.data || null);
    } catch (err) {
      console.error('Failed to fetch provider profile', err);
    }
  };

  const fetchPets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/provider/pets`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setPets(response.data.data || []);
    } catch (err) {
      console.error('Error fetching pets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/categories?type=pet`);
      setCategories(response.data.data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  useEffect(() => {
    fetchPets();
    fetchCategories();
    fetchProfile();
  }, [accessToken]);

  useEffect(() => {
    const reopen = sessionStorage.getItem('reopenListPet');
    if (reopen === 'true' && profile && pets.length > 0 && categories.length > 0) {
      sessionStorage.removeItem('reopenListPet');
      const activePetsCount = pets.filter(p => p.listingType === 'ADOPTION' && p.status === 'ACTIVE').length;
      const unusedCredit = profile.unusedCreditCount || 0;
      if (activePetsCount < 1 || unusedCredit >= 1) {
        handleOpenAdd();
      }
    }
  }, [profile, pets, categories]);

  const handleDelete = async (petId) => {
    if (!window.confirm('Are you sure you want to delete this pet listing?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/provider/pets/${petId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success('Pet listing deleted successfully');
      fetchPets();
    } catch (err) {
      toast.error('Failed to delete pet listing');
    }
  };

  const handleOpenAdd = () => {
    const activePetsCount = pets.filter(p => p.listingType === 'ADOPTION' && p.status === 'ACTIVE').length;
    const unusedCredit = profile?.unusedCreditCount || 0;

    if (activePetsCount >= 1 && unusedCredit < 1) {
      setShowPremiumDialog(true);
      return;
    }

    setEditingPet(null);
    setFormData({
      name: '',
      breed: '',
      categoryId: categories[0]?.id || '',
      gender: 'MALE',
      age: '',
      weight: '',
      color: '',
      vaccinationStatus: 'PARTIALLY_VACCINATED',
      healthStatus: 'HEALTHY',
      medicalHistory: '',
      microchipNumber: '',
      listingType: 'SALE',
      price: '',
      discountPercent: '',
      gst: '',
      description: '',
      shortDescription: '',
      location: '',
      status: 'ACTIVE',
      images: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pet) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name || '',
      breed: pet.breed || '',
      categoryId: pet.categoryId || '',
      gender: pet.gender || 'MALE',
      age: pet.age || '',
      weight: pet.weight || '',
      color: pet.color || '',
      vaccinationStatus: pet.vaccinationStatus || 'PARTIALLY_VACCINATED',
      healthStatus: pet.healthStatus || 'HEALTHY',
      medicalHistory: pet.medicalHistory || '',
      microchipNumber: pet.microchipNumber || '',
      listingType: pet.listingType || 'SALE',
      price: pet.price || '',
      discountPercent: pet.discountPercent || '',
      gst: pet.gst || '',
      description: pet.description || '',
      shortDescription: pet.shortDescription || '',
      location: pet.location || '',
      status: pet.status || 'ACTIVE',
      images: pet.images?.map(img => img.url) || []
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const data = new FormData();
    files.forEach((file) => data.append('images', file));

    try {
      setUploadingImages(true);
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/provider/pets/upload-images`, data, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${accessToken}`
        },
        withCredentials: true
      });
      const uploadedUrls = response.data.data || [];
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
      toast.success('Images uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    try {
      const payload = {
        ...formData,
        isPet: true,
        listingType: 'ADOPTION',
        price: formData.price ? parseFloat(formData.price) : 0,
        discountPercent: 0,
        gst: 0,
        weight: formData.weight ? parseFloat(formData.weight) : null
      };

      if (editingPet) {
        await axios.put(`${import.meta.env.VITE_API_URL}/provider/pets/${editingPet.id}`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        toast.success('Pet listing updated successfully');
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/provider/pets`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        toast.success('Pet listed successfully');
      }
      setIsModalOpen(false);
      fetchPets();
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save pet listing');
    }
  };

  const filteredPets = pets.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.breed?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Pet Listings (Marketplace & Adoption)</h2>
          <p className="text-sm text-gray-500">Manage your dogs, cats, puppies, and clinic adoptions.</p>
        </div>
        <PremiumButton onClick={handleOpenAdd} className="flex items-center space-x-2">
          <Plus size={18} />
          <span>List Pet</span>
        </PremiumButton>
      </div>

      <GlassCard className="p-6">
        <div className="mb-6 relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <MinimalInput
            type="text"
            placeholder="Search pets by name or breed..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-4 px-4 font-semibold text-gray-600 w-16">Image</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Name</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Breed</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Gender</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Age</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Status</th>
                  <th className="py-4 px-4 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPets.length > 0 ? (
                  filteredPets.map((pet) => (
                    <tr key={pet.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                          {pet.images && pet.images.length > 0 ? (
                            <img src={getFullImageUrl(pet.images[0].url)} alt={pet.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={20} className="text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-800">{pet.name}</td>
                      <td className="py-4 px-4 text-gray-600">{pet.breed}</td>
                      <td className="py-4 px-4 text-gray-600 font-bold text-xs uppercase">{pet.gender || 'MALE'}</td>
                      <td className="py-4 px-4 text-gray-600 text-sm">{pet.age}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          pet.isSold ? 'bg-red-50 text-red-600' : 'bg-success/10 text-success'
                        }`}>
                          {pet.isSold ? 'Adopted' : 'Available'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <button onClick={() => handleOpenEdit(pet)} className="text-gray-400 hover:text-primary transition-colors p-2 rounded-lg hover:bg-orange-50">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(pet.id)} className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-500">
                      No pets listed yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[24px] max-w-4xl w-full shadow-premium p-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
              <X size={20} />
            </button>

            <h3 className="text-2xl font-bold font-outfit text-secondary mb-6">
              {editingPet ? 'Edit Pet Listing' : 'List a New Pet'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MinimalInput required label="Pet Name" placeholder="e.g. Milo" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                <MinimalInput required label="Breed" placeholder="e.g. Golden Retriever" value={formData.breed} onChange={(e) => setFormData({...formData, breed: e.target.value})} />
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</label>
                  <select required value={formData.categoryId} onChange={(e) => setFormData({...formData, categoryId: e.target.value})} className="w-full h-14 px-5 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all">
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gender</label>
                  <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full h-14 px-5 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all">
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                <MinimalInput required label="Age" placeholder="e.g. 3 months" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} />
                <MinimalInput type="number" step="0.01" label="Weight (kg)" placeholder="e.g. 5.5" value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} />
                <MinimalInput label="Color / Coat" placeholder="e.g. Golden" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vaccination Status</label>
                  <select value={formData.vaccinationStatus} onChange={(e) => setFormData({...formData, vaccinationStatus: e.target.value})} className="w-full h-14 px-5 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all">
                    <option value="FULLY_VACCINATED">Fully Vaccinated</option>
                    <option value="PARTIALLY_VACCINATED">Partially Vaccinated</option>
                    <option value="NOT_VACCINATED">Not Vaccinated</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Health Status</label>
                  <select value={formData.healthStatus} onChange={(e) => setFormData({...formData, healthStatus: e.target.value})} className="w-full h-14 px-5 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all">
                    <option value="HEALTHY">Healthy</option>
                    <option value="TREATMENT">Under Treatment</option>
                    <option value="SPECIAL_NEEDS">Special Needs</option>
                  </select>
                </div>

{/* For Adoption defaults automatically */}
                
                <MinimalInput label="Microchip Number" placeholder="e.g. 90021500" value={formData.microchipNumber} onChange={(e) => setFormData({...formData, microchipNumber: e.target.value})} />
                <MinimalInput required label="Location" placeholder="e.g. Bangalore Clinic" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                <MinimalInput type="number" label="Adoption Fee (INR)" placeholder="e.g. 15000" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
              </div>

              <div className="grid grid-cols-1 gap-6">
                <MinimalInput label="Medical History / Notes" placeholder="e.g. De-wormed on 12th July" value={formData.medicalHistory} onChange={(e) => setFormData({...formData, medicalHistory: e.target.value})} />
                <MinimalInput label="Short Description" placeholder="e.g. Playful, friendly golden puppy" value={formData.shortDescription} onChange={(e) => setFormData({...formData, shortDescription: e.target.value})} />
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detailed Description</label>
                  <textarea rows={4} required placeholder="Detailed information about the pet..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full p-5 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all resize-none" />
                </div>
              </div>

              {/* Images Upload */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Images (up to 8, at least 1 required)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
                  {formData.images.map((url, index) => (
                    <div key={index} className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden border border-black/[0.05]">
                      <img src={getFullImageUrl(url)} alt="Pet" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handleRemoveImage(index)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {formData.images.length < 8 && (
                    <button type="button" onClick={() => fileInputRef.current.click()} disabled={uploadingImages} className="aspect-square bg-surface border border-dashed border-black/20 rounded-xl flex flex-col items-center justify-center text-muted hover:text-primary hover:border-primary/50 transition-all">
                      {uploadingImages ? <Loader2 className="animate-spin text-primary" size={20} /> : <UploadCloud size={20} />}
                      <span className="text-[10px] font-bold mt-1">Upload</span>
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>

              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-100">
                <PremiumButton type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</PremiumButton>
                <PremiumButton type="submit">Save Listing</PremiumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Premium Listing Dialog Modal */}
      {showPremiumDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-black/[0.05] rounded-[32px] max-w-md w-full p-8 shadow-2xl relative flex flex-col gap-6">
            <button 
              onClick={() => setShowPremiumDialog(false)} 
              className="absolute top-6 right-6 text-muted hover:text-secondary transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-2 mt-4">
              <span className="text-4xl">👑</span>
              <h3 className="text-2xl font-extrabold font-outfit text-secondary">Premium Pet Listing</h3>
              <p className="text-sm font-semibold text-muted">
                You have already used your FREE pet listing.
              </p>
              <p className="text-xs text-muted">
                To publish another pet, a Premium Listing Fee of ₹99 is required.
              </p>
            </div>

            {/* Benefits list */}
            <div className="bg-surface p-5 rounded-2xl border border-black/[0.03] space-y-3">
              <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">Benefits</h4>
              <ul className="space-y-2.5 text-xs text-muted font-semibold">
                <li className="flex items-center gap-2">
                  <span className="text-primary font-extrabold text-sm">✓</span> 
                  Publish Additional Pet Listing
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary font-extrabold text-sm">✓</span> 
                  Priority Support
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary font-extrabold text-sm">✓</span> 
                  Secure Listing
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <PremiumButton 
                onClick={() => {
                  setShowPremiumDialog(false);
                  navigate('/dashboard/provider?tab=premium-payment');
                }} 
                variant="primary" 
                className="w-full flex items-center justify-center gap-2 !py-3"
              >
                Pay ₹99
              </PremiumButton>
              <button 
                onClick={() => setShowPremiumDialog(false)}
                className="text-center text-xs font-bold text-muted hover:underline py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
