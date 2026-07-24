import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Plus, Edit2, Trash2, X, Search, Scissors, ShieldAlert, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PremiumButton from '../ui/PremiumButton.jsx';
import MinimalInput from '../ui/MinimalInput.jsx';
import GlassCard from '../ui/GlassCard.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function ServiceManagement() {
  const { accessToken } = useSelector((state) => state.auth);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'VET',
    description: '',
    shortDescription: '',
    duration: '',
    price: '',
    discountPercent: '',
    gst: '',
    capacity: '1',
    status: 'ACTIVE',
    homeVisit: false,
    clinicVisit: true,
    online: false,
    offline: true,
    cancellationPolicy: '',
    location: '',
    maxBookings: '',
    prepInstructions: '',
    requirements: '',
    availableDays: [],
    timeSlots: [],
    morningStartTime: '09:00',
    morningEndTime: '13:00',
    morningCapacity: '5',
    afternoonStartTime: '14:00',
    afternoonEndTime: '18:00',
    afternoonCapacity: '5'
  });

  const categories = [
    { value: 'GROOMING', label: 'Grooming' },
    { value: 'TRAINING', label: 'Training' },
    { value: 'VET', label: 'Veterinary' },
    { value: 'VACCINATION', label: 'Vaccination' },
    { value: 'HEALTH_CHECKUP', label: 'Health Checkup' },
    { value: 'BOARDING', label: 'Boarding' },
    { value: 'WALKING', label: 'Walking' },
    { value: 'PET_SITTING', label: 'Pet Sitting' },
    { value: 'EMERGENCY_CARE', label: 'Emergency Care' },
    { value: 'OTHER', label: 'Other' }
  ];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const standardTimeSlots = [
    '09:00 - 09:30', '09:30 - 10:00', '10:00 - 10:30', '10:30 - 11:00',
    '11:00 - 11:30', '11:30 - 12:00', '14:00 - 14:30', '14:30 - 15:00',
    '15:00 - 15:30', '15:30 - 16:00', '16:00 - 16:30', '16:30 - 17:00'
  ];

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/provider/services`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setServices(response.data.data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [accessToken]);

  const handleDelete = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/provider/services/${serviceId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success('Service deleted successfully');
      fetchServices();
    } catch (err) {
      toast.error('Failed to delete service');
    }
  };

  const handleOpenAdd = () => {
    setEditingService(null);
    setFormData({
      name: '',
      category: 'VET',
      description: '',
      shortDescription: '',
      duration: '30',
      price: '',
      discountPercent: '',
      gst: '18',
      capacity: '1',
      status: 'ACTIVE',
      homeVisit: false,
      clinicVisit: true,
      online: false,
      offline: true,
      cancellationPolicy: 'Free cancellation up to 24 hours in advance.',
      location: '',
      maxBookings: '10',
      prepInstructions: '',
      requirements: '',
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      timeSlots: ['09:00 - 09:30'],
      morningStartTime: '09:00',
      morningEndTime: '13:00',
      morningCapacity: '5',
      afternoonStartTime: '14:00',
      afternoonEndTime: '18:00',
      afternoonCapacity: '5'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name || '',
      category: service.category || 'VET',
      description: service.description || '',
      shortDescription: service.shortDescription || '',
      duration: service.duration?.toString() || '30',
      price: service.price?.toString() || '',
      discountPercent: service.discountPercent?.toString() || '',
      gst: service.gst?.toString() || '',
      capacity: service.capacity?.toString() || '1',
      status: service.status || 'ACTIVE',
      homeVisit: !!service.homeVisit,
      clinicVisit: !!service.clinicVisit,
      online: !!service.online,
      offline: !!service.offline,
      cancellationPolicy: service.cancellationPolicy || '',
      location: service.location || '',
      maxBookings: service.maxBookings?.toString() || '',
      prepInstructions: service.prepInstructions || '',
      requirements: service.requirements || '',
      availableDays: service.availableDays || [],
      timeSlots: service.timeSlots || [],
      morningStartTime: service.morningStartTime || '09:00',
      morningEndTime: service.morningEndTime || '13:00',
      morningCapacity: service.morningCapacity?.toString() || '5',
      afternoonStartTime: service.afternoonStartTime || '14:00',
      afternoonEndTime: service.afternoonEndTime || '18:00',
      afternoonCapacity: service.afternoonCapacity?.toString() || '5'
    });
    setIsModalOpen(true);
  };

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }));
  };

  const toggleSlot = (slot) => {
    setFormData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.includes(slot)
        ? prev.timeSlots.filter(s => s !== slot)
        : [...prev.timeSlots, slot]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.availableDays.length === 0) {
      toast.error('Please select at least one available working day');
      return;
    }

    try {
      if (editingService) {
        await axios.put(`${import.meta.env.VITE_API_URL}/provider/services/${editingService.id}`, formData, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        toast.success('Service updated successfully');
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/provider/services`, formData, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        toast.success('Service created successfully');
      }
      setIsModalOpen(false);
      fetchServices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save service');
    }
  };

  const filteredServices = services.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Clinic & Care Services</h2>
          <p className="text-sm text-gray-500">Create and list professional packages for client bookings.</p>
        </div>
        <PremiumButton onClick={handleOpenAdd} className="flex items-center space-x-2">
          <Plus size={18} />
          <span>New Service</span>
        </PremiumButton>
      </div>

      <GlassCard className="p-6">
        <div className="mb-6 relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <MinimalInput
            type="text"
            placeholder="Search services by name or category..."
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
                  <th className="py-4 px-4 font-semibold text-gray-600 w-16">Icon</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Service Name</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Category</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Sessions & Live Slots (Today)</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Price</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Status</th>
                  <th className="py-4 px-4 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.length > 0 ? (
                  filteredServices.map((service) => (
                    <tr key={service.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 text-primary flex items-center justify-center">
                          <Scissors size={18} />
                        </div>
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-800">
                        <div>
                          <p className="font-bold">{service.name}</p>
                          <p className="text-xs text-muted font-medium mt-0.5">{service.duration} mins duration</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-bold uppercase tracking-wider">{service.category}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-2 min-w-[280px] my-1">
                          {/* Morning Session */}
                          <div className="bg-surface p-2.5 rounded-xl border border-black/[0.04] space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-secondary font-bold">🌅 Morning ({service.morningStartTime || '09:00'} - {service.morningEndTime || '13:00'})</span>
                              <span className="text-primary font-extrabold">{service.morningBooked ?? 0} / {service.morningCapacity ?? 5} Booked</span>
                            </div>
                            <div className="w-full bg-black/5 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-primary h-full transition-all" 
                                style={{ width: `${Math.min(100, ((service.morningBooked ?? 0) / (service.morningCapacity || 5)) * 100)}%` }} 
                              />
                            </div>
                            <p className="text-[9px] text-gray-400 font-bold">{service.morningRemaining ?? 5} Slots Remaining</p>
                          </div>

                          {/* Afternoon Session */}
                          <div className="bg-surface p-2.5 rounded-xl border border-black/[0.04] space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-secondary font-bold">☀️ Afternoon ({service.afternoonStartTime || '14:00'} - {service.afternoonEndTime || '18:00'})</span>
                              <span className="text-primary font-extrabold">{service.afternoonBooked ?? 0} / {service.afternoonCapacity ?? 5} Booked</span>
                            </div>
                            <div className="w-full bg-black/5 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-primary h-full transition-all" 
                                style={{ width: `${Math.min(100, ((service.afternoonBooked ?? 0) / (service.afternoonCapacity || 5)) * 100)}%` }} 
                              />
                            </div>
                            <p className="text-[9px] text-gray-400 font-bold">{service.afternoonRemaining ?? 5} Slots Remaining</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600 font-semibold">{formatCurrency(service.price)}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          service.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-red-50 text-red-600'
                        }`}>
                          {service.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <button onClick={() => handleOpenEdit(service)} className="text-gray-400 hover:text-primary transition-colors p-2 rounded-lg hover:bg-orange-50">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(service.id)} className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-500">
                      No services listed yet.
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
              {editingService ? 'Edit Service Details' : 'Create a New Service'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MinimalInput required label="Service Name" placeholder="e.g. Full Grooming & De-Shedding" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</label>
                  <select 
                    required 
                    value={formData.category} 
                    onChange={(e) => {
                      const cat = e.target.value;
                      const isVet = cat === 'VET' || cat === 'HEALTH_CHECKUP';
                      setFormData({
                        ...formData,
                        category: cat,
                        gst: isVet ? 0 : (formData.gst === 0 ? 18 : formData.gst)
                      });
                    }} 
                    className="w-full h-14 px-5 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <MinimalInput required type="number" label="Duration (mins)" placeholder="30" value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})} />
                <MinimalInput required type="number" step="0.01" label="Price (INR)" placeholder="500" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                <MinimalInput type="number" label="Discount (%)" placeholder="0" value={formData.discountPercent} onChange={(e) => setFormData({...formData, discountPercent: e.target.value})} />
                
                <MinimalInput 
                  type="number" 
                  disabled={formData.category === 'VET' || formData.category === 'HEALTH_CHECKUP'} 
                  label={formData.category === 'VET' || formData.category === 'HEALTH_CHECKUP' ? "GST (Exempt / 0%)" : "GST (%)"} 
                  placeholder="18" 
                  value={formData.category === 'VET' || formData.category === 'HEALTH_CHECKUP' ? 0 : formData.gst} 
                  onChange={(e) => setFormData({...formData, gst: e.target.value})} 
                />
                
                <MinimalInput type="number" label="Slots Capacity" placeholder="1" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: e.target.value})} />
                <MinimalInput label="Max Bookings Per Day" placeholder="10" value={formData.maxBookings} onChange={(e) => setFormData({...formData, maxBookings: e.target.value})} />
                <MinimalInput label="Location (e.g. Whitefield Clinic)" placeholder="e.g. Bangalore" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface p-5 rounded-[16px] border border-black/[0.05]">
                <label className="flex items-center gap-2 font-semibold text-secondary text-sm select-none cursor-pointer">
                  <input type="checkbox" checked={formData.homeVisit} onChange={(e) => setFormData({...formData, homeVisit: e.target.checked})} className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300" />
                  Home Visit
                </label>
                <label className="flex items-center gap-2 font-semibold text-secondary text-sm select-none cursor-pointer">
                  <input type="checkbox" checked={formData.clinicVisit} onChange={(e) => setFormData({...formData, clinicVisit: e.target.checked})} className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300" />
                  Clinic Visit
                </label>
                <label className="flex items-center gap-2 font-semibold text-secondary text-sm select-none cursor-pointer">
                  <input type="checkbox" checked={formData.online} onChange={(e) => setFormData({...formData, online: e.target.checked})} className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300" />
                  Online Consult
                </label>
                <label className="flex items-center gap-2 font-semibold text-secondary text-sm select-none cursor-pointer">
                  <input type="checkbox" checked={formData.offline} onChange={(e) => setFormData({...formData, offline: e.target.checked})} className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300" />
                  In Person
                </label>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <MinimalInput label="Short Description" placeholder="e.g. Premium bath and haircut package" value={formData.shortDescription} onChange={(e) => setFormData({...formData, shortDescription: e.target.value})} />
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detailed Description</label>
                  <textarea rows={3} required placeholder="Detailed information about what the service includes..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full p-5 rounded-[16px] bg-surface text-secondary font-medium outline-none border border-black/[0.07] focus:border-primary focus:bg-white transition-all resize-none" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <MinimalInput label="Requirements" placeholder="e.g. Vaccination card required" value={formData.requirements} onChange={(e) => setFormData({...formData, requirements: e.target.value})} />
                  <MinimalInput label="Preparation Instructions" placeholder="e.g. Do not feed 2 hours prior" value={formData.prepInstructions} onChange={(e) => setFormData({...formData, prepInstructions: e.target.value})} />
                </div>

                <MinimalInput label="Cancellation Policy" placeholder="e.g. Full refund up to 24 hrs prior" value={formData.cancellationPolicy} onChange={(e) => setFormData({...formData, cancellationPolicy: e.target.value})} />
              </div>

              {/* Working Days */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Available Days</label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map(day => {
                    const selected = formData.availableDays.includes(day);
                    return (
                      <button key={day} type="button" onClick={() => toggleDay(day)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        selected ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface text-secondary border-black/[0.07] hover:bg-black/5'
                      }`}>
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Working Sessions Configurations */}
              <div className="space-y-4 bg-surface p-5 rounded-[20px] border border-black/[0.05]">
                <h4 className="font-bold text-secondary text-sm">📅 Working Sessions Configurations</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Morning Session */}
                  <div className="p-4 bg-white rounded-2xl border border-black/[0.05] space-y-4">
                    <h5 className="font-bold text-secondary text-xs uppercase tracking-wider text-primary">🌅 Morning Session</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <MinimalInput required label="Start Time" placeholder="e.g. 09:00" value={formData.morningStartTime} onChange={(e) => setFormData({...formData, morningStartTime: e.target.value})} />
                      <MinimalInput required label="End Time" placeholder="e.g. 13:00" value={formData.morningEndTime} onChange={(e) => setFormData({...formData, morningEndTime: e.target.value})} />
                    </div>
                    <MinimalInput required type="number" label="Morning Slots Capacity" placeholder="5" value={formData.morningCapacity} onChange={(e) => setFormData({...formData, morningCapacity: e.target.value})} />
                  </div>

                  {/* Afternoon Session */}
                  <div className="p-4 bg-white rounded-2xl border border-black/[0.05] space-y-4">
                    <h5 className="font-bold text-secondary text-xs uppercase tracking-wider text-primary">☀️ Afternoon Session</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <MinimalInput required label="Start Time" placeholder="e.g. 14:00" value={formData.afternoonStartTime} onChange={(e) => setFormData({...formData, afternoonStartTime: e.target.value})} />
                      <MinimalInput required label="End Time" placeholder="e.g. 18:00" value={formData.afternoonEndTime} onChange={(e) => setFormData({...formData, afternoonEndTime: e.target.value})} />
                    </div>
                    <MinimalInput required type="number" label="Afternoon Slots Capacity" placeholder="5" value={formData.afternoonCapacity} onChange={(e) => setFormData({...formData, afternoonCapacity: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-100">
                <PremiumButton type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</PremiumButton>
                <PremiumButton type="submit">Save Service</PremiumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
