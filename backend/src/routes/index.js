import { Router } from 'express';
import authRouter from './auth.routes.js';
import petRouter from './pet.routes.js';
import appointmentRouter from './appointment.routes.js';
import categoryRouter from './category.routes.js';
import wishlistRouter from './wishlist.routes.js';
import orderRouter from './order.routes.js';
import addressRouter from './address.routes.js';
import profileRouter from './profile.routes.js';
import searchRouter from './search.routes.js';
import cartRouter from './cart.routes.js';
import userRouter from './user.routes.js';
import adoptionRouter from './adoption.routes.js';
import sellerRouter from './seller.routes.js';
import providerRouter from './provider.routes.js';
import adminRouter from './admin.routes.js';
import reviewRouter from './review.routes.js';
import walletRouter from './wallet.routes.js';
import paymentRouter from './payment.routes.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Authentication routes
router.use('/auth', authRouter);

// Pet Profile routes
router.use('/pets', petRouter);

// Order routes
router.use('/orders', orderRouter);

// Address routes
router.use('/addresses', addressRouter);

// Appointment routes
router.use('/appointments', appointmentRouter);

// Category routes
router.use('/categories', categoryRouter);

// Wishlist routes
router.use('/wishlist', wishlistRouter);

// Profile routes
router.use('/profile', profileRouter);

// Search routes
router.use('/search', searchRouter);

// Cart routes
router.use('/cart', cartRouter);

// User Profile routes
router.use('/users', userRouter);

// Adoption routes
router.use('/adoptions', adoptionRouter);

// Seller routes
router.use('/seller', sellerRouter);

// Provider routes
router.use('/provider', providerRouter);

// Admin routes
router.use('/admin', adminRouter);

// Review routes
router.use('/reviews', reviewRouter);

// Wallet routes
router.use('/wallet', walletRouter);

// Payment routes (Razorpay)
router.use('/payments', paymentRouter);

export default router;

