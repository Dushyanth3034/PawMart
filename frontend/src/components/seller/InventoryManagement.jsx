import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Package, AlertCircle, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PremiumButton from '../ui/PremiumButton.jsx';
import GlassCard from '../ui/GlassCard.jsx';

export default function InventoryManagement() {
  const { accessToken } = useSelector((state) => state.auth);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Inline edit states
  const [editingId, setEditingId] = useState(null);
  const [updatingQuantity, setUpdatingQuantity] = useState(0);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/seller/inventory`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setInventory(res.data.data || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (productId) => {
    try {
      const qtyVal = parseInt(updatingQuantity, 10);
      if (isNaN(qtyVal) || qtyVal < 0) {
        toast.error('Quantity must be a non-negative number');
        return;
      }
      
      await axios.put(`${import.meta.env.VITE_API_URL}/seller/inventory/${productId}`, {
        quantity: qtyVal
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      
      toast.success('Stock quantity updated successfully');
      setEditingId(null);
      fetchInventory();
      
      // Dispatch live refresh event for dashboard overview
      window.dispatchEvent(new CustomEvent('seller-data-changed'));
    } catch (err) {
      console.error('Error updating inventory:', err);
      toast.error(err.response?.data?.message || 'Failed to update inventory');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) return <div className="text-error">Error: {error}</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-2">Inventory Management</h2>
        <p className="text-muted text-sm">Monitor stock levels, low stock alerts, and update availability.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard hoverEffect={false} className="p-6 border-black/[0.07]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[16px] bg-primary text-white flex items-center justify-center shrink-0">
              <Package size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Total Stock Units</p>
              <h3 className="text-2xl font-extrabold text-secondary">
                {inventory.reduce((sum, item) => sum + item.quantity, 0)}
              </h3>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard hoverEffect={false} className="p-6 border-black/[0.07]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[16px] bg-yellow-500/10 text-yellow-600 flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Low Stock Alerts</p>
              <h3 className="text-2xl font-extrabold text-secondary">
                {inventory.filter(item => item.quantity > 0 && item.quantity <= 5).length}
              </h3>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="bg-white rounded-[24px] border border-black/[0.07] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-black/[0.07]">
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Product Name</th>
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">SKU/ID</th>
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Stock Qty</th>
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-muted uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-muted font-medium">No products added yet.</td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.id} className="border-b border-black/[0.03] hover:bg-black/[0.02] transition-colors">
                    <td className="p-4 font-bold text-secondary">{item.product?.name || 'Unknown Product'}</td>
                    <td className="p-4 text-sm font-medium text-muted">{(item.product?.slug || item.id).substring(0, 8)}...</td>
                    <td className="p-4 font-bold text-secondary">
                      {editingId === item.id ? (
                        <input
                          type="number"
                          min="0"
                          value={updatingQuantity}
                          onChange={(e) => setUpdatingQuantity(e.target.value)}
                          className="w-20 px-2 py-1 border border-primary rounded-[8px] focus:ring-2 focus:ring-primary/20 outline-none text-secondary font-bold text-sm"
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td className="p-4">
                      {item.quantity === 0 ? (
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">Out of Stock</span>
                      ) : item.quantity <= 5 ? (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">Low Stock</span>
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">In Stock</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {editingId === item.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUpdateQuantity(item.productId)}
                            className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-all shadow-sm"
                            aria-label="Save quantity"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all shadow-sm"
                            aria-label="Cancel editing"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <PremiumButton
                          variant="secondary"
                          className="!px-4 !py-2 text-sm"
                          onClick={() => {
                            setEditingId(item.id);
                            setUpdatingQuantity(item.quantity);
                          }}
                        >
                          Update
                        </PremiumButton>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
