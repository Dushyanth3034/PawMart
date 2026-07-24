import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import {
  getProviderDashboardStats,
  getProviderPets,
  getProviderServices,
  createProviderService,
  updateProviderService,
  deleteProviderService,
  getProviderBookings,
  getProviderCustomers,
  getProviderReviews,
  getProviderProfile,
  updateProviderProfile,
  uploadProviderStoreImage,
  getProviderNotifications,
  getProviderAdoptionRequests,
  updateAdoptionRequestStatus,
  createPremiumPayment
} from '../controllers/provider.controller.js';
import { createProduct, updateProduct, deleteProduct, uploadProductImagesEndpoint } from '../controllers/product.controller.js';
import { replyToReview } from '../controllers/review.controller.js';
import { uploadProfileImage, uploadProductImages } from '../middleware/upload.middleware.js';

const router = Router();

// Secure all provider routes
router.use(protect);
router.use(restrictTo('SERVICE_PROVIDER'));

router.get('/dashboard', getProviderDashboardStats);
router.post('/premium-payment', createPremiumPayment);

// Pets CRUD
router.route('/pets')
  .get(getProviderPets)
  .post(createProduct);

router.post('/pets/upload-images', uploadProductImages.array('images', 8), uploadProductImagesEndpoint);

router.route('/pets/:id')
  .put(updateProduct)
  .delete(deleteProduct);

// Services CRUD
router.route('/services')
  .get(getProviderServices)
  .post(createProviderService);

router.route('/services/:id')
  .put(updateProviderService)
  .delete(deleteProviderService);

// Bookings, Customers, Reviews
router.get('/bookings', getProviderBookings);
router.get('/customers', getProviderCustomers);
router.get('/reviews', getProviderReviews);
router.post('/reviews/:id/reply', replyToReview);
router.get('/notifications', getProviderNotifications);

// Provider Adoption Requests Management
router.get('/adoptions', getProviderAdoptionRequests);
router.put('/adoptions/:id/status', updateAdoptionRequestStatus);

// Profile
router.route('/profile')
  .get(getProviderProfile)
  .put(updateProviderProfile);

router.post('/profile/upload', uploadProfileImage.single('image'), uploadProviderStoreImage);

export default router;
