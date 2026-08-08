import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Tag, Plus, Scissors, Edit2, Trash2, X, Check, Calendar, Percent, IndianRupee, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PremiumButton from '../ui/PremiumButton.jsx';
import GlassCard from '../ui/GlassCard.jsx';
import MinimalInput from '../ui/MinimalInput.jsx';

export default function Coupons() {
  const { accessToken } = useSelector((state) => state.auth);
  const [coupons, setCoupons] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    code: '',
    discount: '',
    isPercent: true,
    expiresAt: '',
    active: true,
    usageLimit: '',
    selectedProductIds: []
  });

  useEffect(() => {
    fetchCoupons();
    fetchSellerProducts();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/seller/coupons`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setCoupons(res.data.data || []);
    } catch (err) {
      console.error('Failed to load coupons:', err);
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const fetchSellerProducts = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/seller/products`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setSellerProducts(res.data.data || []);
    } catch (err) {
      console.error('Failed to load seller products:', err);
    }
  };

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    // Default expiry 30 days from now
    const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setForm({
      code: '',
      discount: '',
      isPercent: true,
      expiresAt: defaultExpiry,
      active: true,
      usageLimit: '',
      selectedProductIds: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (coupon) => {
    setEditingCoupon(coupon);
    const expiryStr = coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : '';
    setForm({
      code: coupon.code || '',
      discount: coupon.discount || '',
      isPercent: coupon.isPercent ?? true,
      expiresAt: expiryStr,
      active: coupon.active ?? true,
      usageLimit: coupon.usageLimit || '',
      selectedProductIds: coupon.products ? coupon.products.map(p => p.id) : []
    });
    setIsModalOpen(true);
  };

  const handleToggleProductSelection = (productId) => {
    setForm(prev => {
      const current = prev.selectedProductIds;
      if (current.includes(productId)) {
        return { ...prev, selectedProductIds: current.filter(id => id !== productId) };
      } else {
        return { ...prev, selectedProductIds: [...current, productId] };
      }
    });
  };

  const handleSelectAllProducts = () => {
    if (form.selectedProductIds.length === sellerProducts.length) {
      setForm(prev => ({ ...prev, selectedProductIds: [] }));
    } else {
      setForm(prev => ({ ...prev, selectedProductIds: sellerProducts.map(p => p.id) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) {
      return toast.error('Please enter a promo code');
    }
    const val = parseFloat(form.discount);
    if (isNaN(val) || val <= 0) {
      return toast.error('Discount value must be greater than 0');
    }
    if (form.isPercent && val > 100) {
      return toast.error('Percentage discount cannot exceed 100%');
    }

    setSubmitting(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discount: val,
        isPercent: form.isPercent,
        expiresAt: form.expiresAt,
        active: form.active,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
        productIds: form.selectedProductIds
      };

      if (editingCoupon) {
        await axios.put(`${import.meta.env.VITE_API_URL}/seller/coupons/${editingCoupon.id}`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        toast.success('Promo code updated successfully');
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/seller/coupons`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        toast.success('Promo code created successfully');
      }
      setIsModalOpen(false);
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save promo code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (couponId, code) => {
    if (!window.confirm(`Delete promo code "${code}"?\n\nNote: Existing completed orders that used this code will remain unaffected.`)) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/seller/coupons/${couponId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success('Promo code deleted successfully');
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete promo code');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-1">Coupons & Promo Codes</h2>
          <p className="text-muted text-sm">Create and manage discounts for your products and customers.</p>
        </div>
        <PremiumButton 
          variant="primary" 
          onClick={handleOpenCreate}
          className="!px-6 flex items-center gap-2"
        >
          <Plus size={18} /> Create Promo Code
        </PremiumButton>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : coupons.length === 0 ? (
        <GlassCard className="p-12 text-center space-y-4 border-black/[0.07]">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <Tag size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-secondary">No Promo Codes Created Yet</h3>
            <p className="text-xs text-muted max-w-sm mx-auto mt-1">
              Boost your product sales by offering promotional discounts to buyers at checkout.
            </p>
          </div>
          <PremiumButton variant="primary" onClick={handleOpenCreate} className="!py-2 !px-6 text-xs font-bold inline-flex items-center gap-2">
            <Plus size={16} /> Create Your First Promo Code
          </PremiumButton>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((coupon) => (
            <GlassCard key={coupon.id} className="p-6 border-black/[0.07] flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-xl font-bold font-mono text-sm border border-primary/20">
                    <Scissors size={14} />
                    {coupon.code}
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider ${
                    coupon.active && new Date(coupon.expiresAt) > new Date()
                      ? 'bg-success/10 text-success' 
                      : 'bg-black/5 text-muted'
                  }`}>
                    {coupon.active && new Date(coupon.expiresAt) > new Date() ? 'Active' : 'Disabled / Expired'}
                  </span>
                </div>

                <div className="mb-4">
                  <h3 className="text-3xl font-extrabold text-secondary mb-1">
                    {coupon.isPercent ? `${coupon.discount}%` : `₹${coupon.discount}`} OFF
                  </h3>
                  <p className="text-xs text-muted font-medium">Used {coupon.usageCount} times</p>
                </div>

                <div className="space-y-1.5 text-xs text-muted border-t border-black/[0.05] pt-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-400" />
                    <span>Expires: {new Date(coupon.expiresAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Package size={13} className="text-gray-400" />
                    <span>
                      {coupon.products && coupon.products.length > 0 
                        ? `Applies to ${coupon.products.length} product(s)` 
                        : 'Applies to all your products'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-black/[0.05] flex justify-end items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(coupon)}
                  className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-all flex items-center gap-1"
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(coupon.id, coupon.code)}
                  className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] max-w-lg w-full shadow-premium p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold font-outfit text-secondary mb-1">
              {editingCoupon ? 'Edit Promo Code' : 'Create Promo Code'}
            </h3>
            <p className="text-xs text-muted mb-6">
              Specify the discount rate, expiry, and target products for your promotion.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <MinimalInput
                label="Promo Code"
                placeholder="e.g. PET10, SAVE200"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2 ml-1">Discount Type</label>
                  <select
                    value={form.isPercent ? 'percentage' : 'fixed'}
                    onChange={(e) => setForm({ ...form, isPercent: e.target.value === 'percentage' })}
                    className="w-full bg-surface border border-black/[0.07] rounded-[16px] px-4 py-3 text-sm font-bold text-secondary outline-none focus:border-primary/50"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <MinimalInput
                  label={`Discount Value (${form.isPercent ? '%' : '₹'})`}
                  type="number"
                  step="0.01"
                  placeholder={form.isPercent ? '10' : '200'}
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <MinimalInput
                  label="Expiry Date"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  required
                />

                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2 ml-1">Status</label>
                  <select
                    value={form.active ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}
                    className="w-full bg-surface border border-black/[0.07] rounded-[16px] px-4 py-3 text-sm font-bold text-secondary outline-none focus:border-primary/50"
                  >
                    <option value="true">Active</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              </div>

              {/* Product Selection List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider ml-1">
                    Applies To Products ({form.selectedProductIds.length || 'All'})
                  </label>
                  {sellerProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllProducts}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      {form.selectedProductIds.length === sellerProducts.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                <div className="bg-surface border border-black/[0.07] rounded-[16px] p-3 max-h-40 overflow-y-auto space-y-2">
                  {sellerProducts.length === 0 ? (
                    <p className="text-xs text-muted text-center py-2">No products available in your store.</p>
                  ) : (
                    sellerProducts.map((p) => {
                      const isSelected = form.selectedProductIds.includes(p.id);
                      return (
                        <label 
                          key={p.id} 
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/[0.02] cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleProductSelection(p.id)}
                            className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                          />
                          <span className="text-xs font-bold text-secondary truncate">{p.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="text-[10px] text-muted ml-1">
                  * If no specific products are selected, promo code applies to all products in your store.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
                <PremiumButton
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </PremiumButton>
                <PremiumButton
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingCoupon ? 'Update Code' : 'Create Code'}
                </PremiumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
