import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { 
  createRazorpayOrder, 
  verifyRazorpayPayment, 
  handleRazorpayWebhook,
  validatePromoCode
} from '../controllers/payment.controller.js';

const router = Router();

// 1. Webhook Route (Public / Raw body handler)
router.post('/razorpay/webhook', handleRazorpayWebhook);

// Authenticated Payment Routes
router.use(protect);

// 2. Create Razorpay Order
router.post('/razorpay/create-order', createRazorpayOrder);

// 3. Verify Razorpay Payment Signature
router.post('/razorpay/verify', verifyRazorpayPayment);

// 4. Validate Promo Code / Coupon
router.post('/validate-promo', validatePromoCode);

export default router;
