import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { updateQuantity, removeFromCartAPI, clearCart } from '../redux/cartSlice.js';
import { Trash, ShoppingBag, ArrowRight, Tag, Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import PremiumButton from '../components/ui/PremiumButton.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';
import MinimalInput from '../components/ui/MinimalInput.jsx';
import { formatCurrency } from '../utils/formatCurrency.js';
import { getFullImageUrl } from '../utils/imageHelper.js';

export default function CartPage() {
  const { items, subtotal } = useSelector((state) => state.cart);
  const dispatch = useDispatch();

  return (
    <div className="bg-background min-h-screen pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex flex-col gap-4 mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold font-outfit tracking-tight text-secondary">Your Cart.</h1>
          <p className="text-muted font-medium text-lg max-w-xl">Review products and adjust quantities before proceeding to checkout.</p>
        </div>

        {items.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-24 bg-surface border border-black/[0.07] rounded-[32px] shadow-sm">
            <ShoppingBag className="mx-auto text-black/10 mb-6" size={64} />
            <h3 className="font-extrabold text-2xl text-secondary font-outfit">Your cart is empty</h3>
            <p className="text-muted font-medium mt-3 mb-10 max-w-xs mx-auto">Looks like you haven't added any premium essentials to your cart yet.</p>
            <Link to="/shop">
              <PremiumButton variant="primary">Browse Collection</PremiumButton>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            {/* Cart items list */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {items.map((item, index) => (
                <motion.div 
                  key={item.id || `${item.product.id}-${item.product.selectedColor || ''}-${item.product.selectedSize || ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: index * 0.1 } }}
                  className="bg-surface border border-black/[0.07] rounded-[32px] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm group"
                >
                  <div className="flex items-center gap-6 w-full sm:w-auto">
                    <div className="w-24 h-24 rounded-[20px] bg-surface overflow-hidden shrink-0 border border-black/[0.07]">
                      <img src={getFullImageUrl(item.product.images?.[0]?.url || item.product.image)} alt={item.product.name} className="object-cover w-full h-full mix-blend-multiply group-hover:scale-110 transition-transform duration-700" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h4 className="font-bold text-base text-secondary line-clamp-1">{item.product.name}</h4>
                      {(item.product.selectedColor || item.product.selectedSize) && (
                        <p className="text-xs text-muted font-bold uppercase tracking-wider flex items-center gap-2">
                          {item.product.selectedColor && (
                            <span className="flex items-center gap-1.5">
                              Color: <span className="text-secondary font-extrabold">{item.product.selectedColor}</span>
                            </span>
                          )}
                          {item.product.selectedColor && item.product.selectedSize && <span>•</span>}
                          {item.product.selectedSize && (
                            <span>
                              Size: <span className="text-secondary font-extrabold">{item.product.selectedSize}</span>
                            </span>
                          )}
                        </p>
                      )}
                      <span className="text-lg font-outfit font-extrabold text-secondary">{formatCurrency(item.product.price)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto gap-8">
                    <div className="flex items-center gap-4 bg-surface border border-black/[0.07] rounded-full px-2 py-1">
                      <button
                        onClick={() => dispatch(updateQuantity({ productId: item.product.id, selectedColor: item.product.selectedColor, selectedSize: item.product.selectedSize, quantity: item.quantity - 1 }))}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white hover:shadow-sm transition text-secondary"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-bold text-secondary w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => dispatch(updateQuantity({ productId: item.product.id, selectedColor: item.product.selectedColor, selectedSize: item.product.selectedSize, quantity: item.quantity + 1 }))}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white hover:shadow-sm transition text-secondary"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => dispatch(removeFromCartAPI(item.id || item.product.id))}
                      className="p-3 text-error hover:bg-error/10 rounded-full transition-colors"
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}

              <button
                onClick={() => dispatch(clearCart())}
                className="text-sm font-bold text-muted hover:text-secondary self-start transition ml-2 mt-4"
              >
                Clear Entire Cart
              </button>
            </div>

            {/* Cart Summary */}
            <GlassCard hoverEffect={false} className="p-8 lg:sticky lg:top-32 !bg-surface border-black/[0.07]">
              <h3 className="text-2xl font-extrabold font-outfit mb-8">Order Summary</h3>

              {/* Totals */}
              <div className="flex flex-col gap-4 text-sm font-medium mb-8">
                <div className="flex justify-between text-secondary">
                  <span>Subtotal</span>
                  <span className="font-bold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>Shipping</span>
                  <span className="font-bold text-muted">Calculated at checkout</span>
                </div>
                <div className="h-px bg-black/[0.07] my-2" />
                <div className="flex justify-between items-center text-secondary">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-3xl font-extrabold font-outfit text-primary">{formatCurrency(subtotal)}</span>
                </div>
              </div>

              <Link to="/checkout" className="block">
                <PremiumButton variant="primary" className="w-full !py-5 !text-lg !rounded-[24px]">
                  Proceed to Checkout <ArrowRight size={20}/>
                </PremiumButton>
              </Link>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}
