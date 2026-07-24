import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { uploadReviewImages } from '../middleware/upload.middleware.js';
import {
  getProductReviews,
  checkReviewEligibility,
  createReview,
  updateReview,
  deleteReview
} from '../controllers/review.controller.js';

const router = Router();

// Public routes
router.get('/product/:productId', getProductReviews);

// Authenticated routes
router.use(protect);
router.get('/check-eligibility', checkReviewEligibility);
router.post('/', uploadReviewImages.array('images', 5), createReview);
router.put('/:id', uploadReviewImages.array('images', 5), updateReview);
router.delete('/:id', deleteReview);

export default router;
