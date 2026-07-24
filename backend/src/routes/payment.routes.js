import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { 
  createRazorpayOrder, 
  verifyRazorpayPayment, 
  handleRazorpayWebhook 
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

export default router;
