import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Search, User, Mail, Phone, Calendar, ShoppingBag } from 'lucide-react';
import GlassCard from '../ui/GlassCard.jsx';
import MinimalInput from '../ui/MinimalInput.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';

export default function CustomerManagement() {
  const { accessToken } = useSelector((state) => state.auth);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/provider/customers`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true
        });
        setCustomers(response.data.data || []);
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, [accessToken]);

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">My Customers & Clients</h2>
        <p className="text-sm text-gray-500">View customer engagement, bookings history, pet purchases, and lifetime revenue contribution.</p>
      </div>

      <GlassCard className="p-6">
        <div className="mb-6 relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <MinimalInput
            type="text"
            placeholder="Search customers by name or email..."
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
                  <th className="py-4 px-4 font-semibold text-gray-600">Customer Name</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Contact</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Bookings Count</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Pet Adoptions</th>
                  <th className="py-4 px-4 font-semibold text-gray-600">Last Interaction</th>
                  <th className="py-4 px-4 font-semibold text-gray-600 text-right">Lifetime Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {c.name?.charAt(0) || <User size={16} />}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{c.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        <p className="flex items-center gap-1"><Mail size={12} className="text-gray-400" /> {c.email}</p>
                        <p className="flex items-center gap-1 mt-0.5"><Phone size={12} className="text-gray-400" /> {c.phone}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className="flex items-center gap-1 font-semibold text-secondary text-sm">
                          <Calendar size={14} className="text-primary" /> {c.bookings}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="flex items-center gap-1 font-semibold text-secondary text-sm">
                          <ShoppingBag size={14} className="text-blue-500" /> {c.pets}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-600 text-sm">
                        {new Date(c.lastVisit).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 font-bold text-secondary text-right">
                        {formatCurrency(c.revenue)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-gray-500">
                      No customer engagement records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
