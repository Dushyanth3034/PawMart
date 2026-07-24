import { Router } from 'express';
import { getCart, addToCart, removeFromCart } from '../controllers/cart.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', getCart);
router.post('/', addToCart);
router.delete('/:id', removeFromCart);

export default router;
