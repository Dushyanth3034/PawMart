import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Star } from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { getFullImageUrl } from '../../utils/imageHelper.js';

export default function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/search?q=${query}`);
        setResults(res.data);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchResults, 400);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex flex-col pt-24 px-6"
        >
          <div className="absolute top-6 right-6">
            <button onClick={onClose} className="p-3 bg-surface hover:bg-black/5 rounded-full transition-colors text-secondary">
              <X size={24} />
            </button>
          </div>

          <div className="max-w-4xl mx-auto w-full">
            <div className="relative mb-12">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted" size={28} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, categories, services..."
                className="w-full h-20 pl-16 pr-8 text-3xl font-outfit font-extrabold bg-white border border-black/10 rounded-[32px] focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-secondary placeholder:text-black/20 shadow-premium"
              />
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : results.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pb-24">
                  {results.map((prod, i) => (
                    <motion.div
                      key={prod.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link to={`/product/${prod.id}`} onClick={onClose} className="block group">
                        <div className="bg-white rounded-[24px] p-3 flex gap-4 items-center border border-black/5 hover:border-primary/30 transition-colors shadow-sm">
                          <div className="w-20 h-20 rounded-[16px] bg-surface overflow-hidden shrink-0">
                            <img src={getFullImageUrl(prod.images?.[0]?.url)} alt={prod.name} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">{prod.category?.name || 'Uncategorized'}</span>
                            <h4 className="font-bold text-sm text-secondary line-clamp-1 group-hover:text-primary transition-colors">{prod.name}</h4>
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-outfit font-extrabold text-primary">${prod.price}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : query.trim() !== '' ? (
                <div className="text-center py-12 text-muted font-medium text-lg">
                  No results found for "<span className="text-secondary font-bold">{query}</span>"
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
