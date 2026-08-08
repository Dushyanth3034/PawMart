import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import {
  getDashboardStats,
  getSellerProducts,
  getSellerInventory,
  getSellerOrders,
  getSellerRevenue,
  getSellerReviews,
  getSellerProfile,
  updateSellerProfile,
  getSellerNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getSellerCoupons,
  getSellerReturns,
  getSellerPayouts,
  getSellerShipping,
  getSellerPerformance,
  uploadStoreImage,
  updateOrderItemStatus,
  updateSellerInventory
} from '../controllers/seller.controller.js';
import { createProduct, updateProduct, deleteProduct, uploadProductImagesEndpoint } from '../controllers/product.controller.js';
import { uploadProfileImage, uploadProductImages } from '../middleware/upload.middleware.js';

const router = Router();

// Secure all seller routes
router.use(protect);
router.use(restrictTo('SELLER'));

router.get('/dashboard', getDashboardStats);

router.route('/products')
  .get(getSellerProducts)
  .post(createProduct);

router.post('/products/upload-images', uploadProductImages.array('images', 8), uploadProductImagesEndpoint);

router.route('/products/:id')
  .put(updateProduct)
  .delete(deleteProduct);

router.get('/inventory', getSellerInventory);
router.put('/inventory/:productId', updateSellerInventory);
router.get('/orders', getSellerOrders);
router.put('/orders/:orderItemId/status', updateOrderItemStatus);
router.get('/revenue', getSellerRevenue);
router.get('/reviews', getSellerReviews);

router.route('/profile')
  .get(getSellerProfile)
  .put(updateSellerProfile);

router.post('/profile/upload', uploadProfileImage.single('image'), uploadStoreImage);

router.get('/notifications', getSellerNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);
router.patch('/notifications/:id/read', markNotificationRead);

router.get('/coupons', getSellerCoupons);
router.get('/returns', getSellerReturns);
router.get('/payouts', getSellerPayouts);
router.get('/shipping', getSellerShipping);
router.get('/performance', getSellerPerformance);

export default router;

