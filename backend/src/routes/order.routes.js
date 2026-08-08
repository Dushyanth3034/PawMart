import { Router } from 'express';
import { createOrder, getUserOrders, cancelOrder, confirmDelivery, disputeDelivery, downloadInvoice } from '../controllers/order.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect); // All order routes require authentication

router.route('/')
  .get(getUserOrders)
  .post(createOrder);

router.get('/:id/invoice', downloadInvoice);

router.route('/:id/cancel')
  .patch(cancelOrder);

router.patch('/items/:orderItemId/confirm-delivery', confirmDelivery);
router.patch('/items/:orderItemId/dispute-delivery', disputeDelivery);

export default router;

