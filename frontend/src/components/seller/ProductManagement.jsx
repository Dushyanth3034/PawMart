import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Plus, Edit2, Trash2, X, Search, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PremiumButton from '../ui/PremiumButton.jsx';
import MinimalInput from '../ui/MinimalInput.jsx';
import GlassCard from '../ui/GlassCard.jsx';
import ProductFormModal from './ProductFormModal.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { getFullImageUrl } from '../../utils/imageHelper.js';

const ProductManagement = () => {
  const { accessToken } = useSelector((state) => state.auth);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/seller/products`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setProducts(response.data.data || response.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const response = await axios.delete(`${import.meta.env.VITE_API_URL}/seller/products/${productId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      const message = response.data?.message || 'Product deleted successfully.';
      toast.success(message);
      fetchProducts();
      // Dispatch live refresh event for dashboard overview
      window.dispatchEvent(new CustomEvent('seller-data-changed'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [accessToken]);

  const filteredProducts = products.filter(product => 
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Product Management</h2>
        <PremiumButton 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Add Product</span>
        </PremiumButton>
      </div>

      <GlassCard className="p-6">
        <div className="mb-6 relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <MinimalInput
            type="text"
            placeholder="Search products by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-4 px-4 font-semibold text-gray-600 w-16">Image</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Product Name</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Category</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Price</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Stock</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Status</th>
                  <th className="py-4 px-4 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <tr key={product._id || product.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                          {product.images && product.images.length > 0 ? (
                            <img src={getFullImageUrl(product.images[0].url)} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={20} className="text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-800">{product.name || 'Unnamed Product'}</td>
                      <td className="py-4 px-4 text-gray-600">{product.category?.name || 'Uncategorized'}</td>
                      <td className="py-4 px-4 text-gray-600">{formatCurrency(product.price)}</td>
                      <td className="py-4 px-4 text-gray-600">{product.inventory?.quantity ?? 0}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          (product.inventory?.quantity ?? 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {(product.inventory?.quantity ?? 0) > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <button className="text-gray-400 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-indigo-50">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(product.id || product._id)} className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                          <Search size={24} className="text-gray-300" />
                        </div>
                        <p>No products found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <ProductFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        accessToken={accessToken} 
        onSuccess={() => {
          setIsModalOpen(false);
          fetchProducts();
          // Dispatch live refresh event for dashboard overview
          window.dispatchEvent(new CustomEvent('seller-data-changed'));
        }}
      />
    </div>
  );
};

export default ProductManagement;
