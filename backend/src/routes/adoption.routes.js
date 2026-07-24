import { Router } from 'express';
import { getAdoptionListings, createAdoptionRequest, getBuyerAdoptionRequests, getBuyerAdoptionRequestDetails, cancelAdoptionRequest } from '../controllers/adoption.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', getAdoptionListings);

// Buyer-only request routes
router.post('/request', protect, restrictTo('BUYER'), createAdoptionRequest);
router.get('/my-requests', protect, restrictTo('BUYER'), getBuyerAdoptionRequests);
router.get('/requests/:id', protect, restrictTo('BUYER'), getBuyerAdoptionRequestDetails);
router.put('/requests/:id/cancel', protect, restrictTo('BUYER'), cancelAdoptionRequest);

export default router;
