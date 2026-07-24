import { Router } from 'express';
import { toggleWishlist, getWishlist } from '../controllers/wishlist.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getWishlist);

router.post('/toggle', toggleWishlist);

export default router;
