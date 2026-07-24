import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Star, MessageCircle, Send, Trash, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../ui/GlassCard.jsx';
import PremiumButton from '../ui/PremiumButton.jsx';

export default function ProviderReviews() {
  const { accessToken } = useSelector((state) => state.auth);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/provider/reviews`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setReviews(response.data.data || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [accessToken]);

  const handleReplySubmit = async (reviewId) => {
    const reply = replyText[reviewId];
    if (!reply || !reply.trim()) {
      toast.error('Reply content cannot be empty');
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/provider/reviews/${reviewId}/reply`, { reply }, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success('Reply submitted successfully');
      setReplyText(prev => ({ ...prev, [reviewId]: '' }));
      fetchReviews();
    } catch (err) {
      toast.error('Failed to submit reply');
    }
  };

  const handleReplyDelete = async (reviewId) => {
    if (!window.confirm('Delete your reply to this review?')) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/provider/reviews/${reviewId}/reply`, { reply: null }, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      toast.success('Reply removed');
      fetchReviews();
    } catch (err) {
      toast.error('Failed to delete reply');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Customer Feedback & Reviews</h2>
        <p className="text-sm text-gray-500">Read reviews left for your pet listings or service appointments, and respond directly.</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : reviews.length > 0 ? (
          reviews.map((rev) => (
            <GlassCard key={rev.id} className="p-6 space-y-4 border-black/[0.04]">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {rev.user?.firstName?.charAt(0) || <User size={18} />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-secondary">{rev.user ? `${rev.user.firstName} ${rev.user.lastName}` : 'N/A'}</h4>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-muted">
                      <span>Reviewed:</span>
                      <span className="font-bold text-gray-700">{rev.product?.name || rev.service?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-yellow-500 bg-yellow-50 px-2 py-1 rounded-lg">
                  <Star size={14} className="fill-current text-yellow-500" />
                  <span className="text-xs font-bold text-secondary">{rev.rating}.0</span>
                </div>
              </div>

              <div>
                {rev.title && <h5 className="font-bold text-secondary mb-1 text-sm">{rev.title}</h5>}
                <p className="text-gray-600 text-sm leading-relaxed">{rev.comment}</p>
              </div>

              {/* Photos */}
              {rev.images && rev.images.length > 0 && (
                <div className="flex gap-2">
                  {rev.images.map((img, i) => (
                    <img key={i} src={img} alt="review attachment" className="w-16 h-16 object-cover rounded-lg border border-black/[0.05]" />
                  ))}
                </div>
              )}

              {/* Reply Section */}
              <div className="border-t border-black/[0.04] pt-4">
                {rev.reply ? (
                  <div className="bg-orange-50/50 border border-orange-100/50 rounded-2xl p-4 flex justify-between items-start gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Your Response</p>
                      <p className="text-sm text-gray-700">{rev.reply}</p>
                    </div>
                    <button onClick={() => handleReplyDelete(rev.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="Delete Reply">
                      <Trash size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Write a reply..."
                      value={replyText[rev.id] || ''}
                      onChange={(e) => setReplyText({ ...replyText, [rev.id]: e.target.value })}
                      className="flex-grow h-11 px-4 text-sm rounded-xl bg-surface border border-black/[0.07] outline-none focus:border-primary transition-all"
                    />
                    <PremiumButton onClick={() => handleReplySubmit(rev.id)} className="!py-2 !px-4 h-11 flex items-center justify-center gap-1.5 text-xs font-bold">
                      <Send size={12} /> Reply
                    </PremiumButton>
                  </div>
                )}
              </div>
            </GlassCard>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500 bg-white border border-black/[0.07] rounded-2xl">
            No reviews received yet.
          </div>
        )}
      </div>
    </div>
  );
}
