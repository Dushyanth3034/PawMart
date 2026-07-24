import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Star, MessageSquare } from 'lucide-react';
import GlassCard from '../ui/GlassCard.jsx';

export default function CustomerReviews() {
  const { accessToken } = useSelector((state) => state.auth);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/seller/reviews`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        withCredentials: true
      });
      setReviews(res.data.data || []);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const avgRating = reviews.length ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold font-outfit text-secondary mb-2">Customer Reviews</h2>
        <p className="text-muted text-sm">See what your customers are saying about your products.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-6 border-black/[0.07] flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-yellow-400/20 text-yellow-600 flex items-center justify-center shrink-0">
            <Star size={28} className="fill-current" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Average Rating</p>
            <h3 className="text-3xl font-extrabold text-secondary">{avgRating} <span className="text-base text-muted font-medium">/ 5.0</span></h3>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-black/[0.07] flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MessageSquare size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Total Reviews</p>
            <h3 className="text-3xl font-extrabold text-secondary">{reviews.length}</h3>
          </div>
        </GlassCard>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-muted">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="bg-white p-8 rounded-[24px] text-center text-muted font-medium border border-black/[0.07]">
            No reviews yet. Keep selling!
          </div>
        ) : (
          reviews.map((review) => (
            <GlassCard key={review.id} hoverEffect={false} className="p-6 border-black/[0.07]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-secondary text-lg">{review.product?.name}</h4>
                  <p className="text-sm text-muted">Reviewed by {review.user?.firstName} {review.user?.lastName}</p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={16} className={star <= review.rating ? "text-yellow-400 fill-current" : "text-black/10"} />
                  ))}
                </div>
              </div>
              {review.title && <h5 className="font-bold text-secondary text-sm mb-2">{review.title}</h5>}
              <p className="text-secondary font-medium bg-surface p-4 rounded-xl leading-relaxed">
                "{review.comment}"
              </p>
              <div className="mt-4 text-xs font-bold text-muted uppercase tracking-wider">
                {new Date(review.createdAt).toLocaleDateString()}
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}
