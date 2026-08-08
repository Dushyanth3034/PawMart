import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Package, Truck, Check, Search, Filter, ShoppingBag, User, MapPin, Phone, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../ui/GlassCard';
import MinimalInput from '../ui/MinimalInput';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { getFullImageUrl } from '../../utils/imageHelper.js';

const OrderManagement = () => {
  const { accessToken } = useSelector((state) => state.auth);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/seller/orders`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setOrders(response.data.data || response.data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderItemId, newStatus) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/seller/orders/${orderItemId}/status`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success(`Order status updated to ${newStatus}`);
      fetchOrders();
      // Dispatch live refresh event for dashboard overview
      window.dispatchEvent(new CustomEvent('seller-data-changed'));
    } catch (err) {
      console.error('Error updating order status:', err);
      toast.error(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'processing':
      case 'accepted': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'packed': return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
      case 'shipped': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'delivered': return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const filteredOrders = orders.filter(order => {
    const idString = String(order.id || order._id || '');
    const buyerName = order.order?.buyer 
      ? `${order.order.buyer.firstName} ${order.order.buyer.lastName}`.toLowerCase()
      : 'guest user';
    const productName = String(order.product?.name || '').toLowerCase();
    const city = String(order.order?.address?.city || '').toLowerCase();
    const street = String(order.order?.address?.street || '').toLowerCase();
    const postalCode = String(order.order?.address?.postalCode || '').toLowerCase();
    
    return idString.toLowerCase().includes(searchTerm.toLowerCase()) || 
           buyerName.includes(searchTerm.toLowerCase()) ||
           productName.includes(searchTerm.toLowerCase()) ||
           city.includes(searchTerm.toLowerCase()) ||
           street.includes(searchTerm.toLowerCase()) ||
           postalCode.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-2">Order Management</h2>
        <p className="text-muted text-sm">Manage, accept, and track shipments for your store products.</p>
      </div>

      <GlassCard hoverEffect={false} className="p-6 border-black/[0.07]">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <MinimalInput
              type="text"
              placeholder="Search by Order ID, Product, Customer, or City..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <button className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            <Filter size={18} />
            <span>Filter</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => {
                const orderStatus = order.status || 'Pending';
                return (
                  <div key={order.id || order._id} className="border border-black/[0.06] rounded-[24px] p-6 md:p-8 bg-white hover:shadow-premium transition-all duration-300">
                    {/* Header Row */}
                    <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-black/[0.05]">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-[14px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <ShoppingBag size={18} />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-muted uppercase tracking-wider">Order ID</p>
                          <p className="text-sm font-extrabold text-secondary">#{String(order.id || order._id).substring(0, 8).toUpperCase()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs font-bold text-muted uppercase tracking-wider">Date</p>
                          <p className="text-sm font-bold text-secondary">
                            {order.order?.createdAt ? new Date(order.order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                          </p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-[12px] text-xs font-bold uppercase tracking-wider ${getStatusColor(orderStatus)}`}>
                          {orderStatus}
                        </span>
                      </div>
                    </div>

                    {/* Middle Section (Buyer + Delivery Address + Product Details) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                      {/* Buyer info column */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Customer Details</h4>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-black/[0.07] bg-surface flex items-center justify-center text-primary font-bold shrink-0">
                            {order.order?.buyer?.avatarUrl ? (
                              <img src={getFullImageUrl(order.order.buyer.avatarUrl)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User size={18} className="text-muted" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-secondary truncate">
                              {order.order?.buyer ? `${order.order.buyer.firstName} ${order.order.buyer.lastName}` : 'Guest User'}
                            </p>
                            <p className="text-xs font-medium text-muted truncate flex items-center gap-1.5 mt-0.5" title={order.order?.buyer?.email}>
                              <Mail size={12} className="shrink-0 text-gray-400" />
                              <span className="truncate">{order.order?.buyer?.email || 'No email'}</span>
                            </p>
                            {order.order?.buyer?.phone && (
                              <p className="text-xs font-medium text-muted truncate flex items-center gap-1.5 mt-0.5">
                                <Phone size={12} className="shrink-0 text-gray-400" />
                                <span>{order.order.buyer.phone}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Delivery Address column */}
                      <div className="space-y-3 bg-surface/60 border border-black/[0.04] p-4 rounded-2xl">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted uppercase tracking-wider">
                          <MapPin size={14} className="text-primary shrink-0" />
                          <span>Delivery Address</span>
                        </div>
                        {order.order?.address ? (
                          <div className="text-xs space-y-1 text-secondary font-medium">
                            <p className="font-bold text-secondary">
                              {order.order.buyer ? `${order.order.buyer.firstName} ${order.order.buyer.lastName}` : 'Customer'}
                            </p>
                            <p className="text-muted leading-relaxed break-words">
                              {order.order.address.street}
                            </p>
                            <p className="text-muted leading-relaxed">
                              {order.order.address.city}, {order.order.address.state} - {order.order.address.postalCode}
                            </p>
                            <p className="text-muted font-semibold text-[11px] uppercase tracking-wider mt-1">
                              {order.order.address.country || 'India'}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs font-medium text-muted italic">No delivery address provided.</p>
                        )}
                      </div>

                      {/* Product details column */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Items Ordered</h4>
                        <div className="flex gap-3">
                          <div className="w-14 h-14 rounded-[14px] border border-black/[0.07] overflow-hidden bg-surface shrink-0 flex items-center justify-center">
                            {order.product?.images?.[0]?.url ? (
                              <img src={getFullImageUrl(order.product.images[0].url)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package size={20} className="text-muted" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-extrabold text-secondary line-clamp-1">{order.product?.name || 'Unknown Product'}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted font-bold uppercase tracking-wider">
                              <span>Qty: {order.quantity}</span>
                              {order.selectedColor && <span>Color: {order.selectedColor}</span>}
                              {order.selectedSize && <span>Size: {order.selectedSize}</span>}
                            </div>
                            <p className="text-xs font-bold text-primary mt-1">
                              Unit Price: {formatCurrency(order.price)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action / Price Row */}
                    <div className="flex flex-wrap justify-between items-center gap-6 mt-8 pt-6 border-t border-black/[0.05]">
                      <div>
                        <p className="text-xs font-bold text-muted uppercase tracking-wider">Item Total</p>
                        <p className="text-2xl font-extrabold text-secondary font-outfit">{formatCurrency(order.price * order.quantity)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleUpdateStatus(order.id || order._id, 'Accepted')}
                          disabled={orderStatus.toLowerCase() !== 'pending'}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                            orderStatus.toLowerCase() === 'pending'
                              ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md shadow-blue-500/20'
                              : 'bg-black/[0.03] text-muted cursor-not-allowed'
                          }`}
                        >
                          <Check size={14} />
                          <span>Accept</span>
                        </button>
                        
                        <button 
                          onClick={() => handleUpdateStatus(order.id || order._id, 'Packed')}
                          disabled={orderStatus.toLowerCase() !== 'accepted' && orderStatus.toLowerCase() !== 'processing'}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                            (orderStatus.toLowerCase() === 'accepted' || orderStatus.toLowerCase() === 'processing')
                              ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                              : 'bg-black/[0.03] text-muted cursor-not-allowed'
                          }`}
                        >
                          <Package size={14} />
                          <span>Pack</span>
                        </button>
                        
                        <button 
                          onClick={() => handleUpdateStatus(order.id || order._id, 'Shipped')}
                          disabled={orderStatus.toLowerCase() !== 'packed'}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                            orderStatus.toLowerCase() === 'packed'
                              ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md shadow-purple-500/20'
                              : 'bg-black/[0.03] text-muted cursor-not-allowed'
                          }`}
                        >
                          <Truck size={14} />
                          <span>Ship</span>
                        </button>

                        <button 
                          onClick={() => handleUpdateStatus(order.id || order._id, 'Delivered')}
                          disabled={orderStatus.toLowerCase() !== 'shipped'}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                            orderStatus.toLowerCase() === 'shipped'
                              ? 'bg-success hover:bg-[#00994d] text-white shadow-md shadow-success/20'
                              : 'bg-black/[0.03] text-muted cursor-not-allowed'
                          }`}
                        >
                          <Check size={14} />
                          <span>Deliver</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-gray-500">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                    <Package size={24} className="text-gray-300" />
                  </div>
                  <p>No orders found.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default OrderManagement;
