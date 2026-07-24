import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import {
  createCategory, updateCategory, deleteCategory,
  createSubcategory, updateSubcategory, deleteSubcategory,
  createBreed, updateBreed, deleteBreed,
  createAgeGroup, updateAgeGroup, deleteAgeGroup,
  getDisputedBookings, resolveAdminDispute,
  getAdminPayouts, approveAdminPayout, rejectAdminPayout,
  // New endpoints
  getAdminDashboard,
  getAdminUsers, suspendUser, reactivateUser,
  getAdminSellers, verifySellerAction,
  getAdminProviders, verifyProviderAction,
  getAdminProducts, toggleProductStatus,
  getAdminAppointments,
  getAdminOrders,
  getAdminAdoptions,
  getAdminPlatformSettings, updateAdminPlatformSettings,
  getAdminFinance,
  getAdminAuditLogs,
  getAdminReviews, deleteAdminReview
} from '../controllers/admin.controller.js';

const router = Router();

// Protect all admin routes
router.use(protect);
router.use(restrictTo('ADMIN'));

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', getAdminDashboard);

// ─── Users ────────────────────────────────────────────────────────────────────
router.get('/users', getAdminUsers);
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/reactivate', reactivateUser);

// ─── Sellers ──────────────────────────────────────────────────────────────────
router.get('/sellers', getAdminSellers);
router.patch('/sellers/:id/verify', verifySellerAction);

// ─── Providers ────────────────────────────────────────────────────────────────
router.get('/providers', getAdminProviders);
router.patch('/providers/:id/verify', verifyProviderAction);

// ─── Products ─────────────────────────────────────────────────────────────────
router.get('/products', getAdminProducts);
router.patch('/products/:id/status', toggleProductStatus);

// ─── Appointments ─────────────────────────────────────────────────────────────
router.get('/appointments', getAdminAppointments);

// ─── Orders ───────────────────────────────────────────────────────────────────
router.get('/orders', getAdminOrders);

// ─── Adoptions ────────────────────────────────────────────────────────────────
router.get('/adoptions', getAdminAdoptions);

// ─── Disputes ─────────────────────────────────────────────────────────────────
router.get('/disputes', getDisputedBookings);
router.patch('/disputes/:id/resolve', resolveAdminDispute);

// ─── Payouts ──────────────────────────────────────────────────────────────────
router.get('/payouts', getAdminPayouts);
router.patch('/payouts/:id/approve', approveAdminPayout);
router.patch('/payouts/:id/reject', rejectAdminPayout);

// ─── Platform Finance ─────────────────────────────────────────────────────────
router.get('/finance', getAdminFinance);

// ─── Platform Settings ────────────────────────────────────────────────────────
router.get('/settings', getAdminPlatformSettings);
router.patch('/settings', updateAdminPlatformSettings);

// ─── Reviews & Reports ────────────────────────────────────────────────────────
router.get('/reviews', getAdminReviews);
router.delete('/reviews/:id', deleteAdminReview);

// ─── Audit Logs ───────────────────────────────────────────────────────────────
router.get('/audit-logs', getAdminAuditLogs);

// ─── Reference Data ───────────────────────────────────────────────────────────
router.route('/categories').post(createCategory);
router.route('/categories/:id').put(updateCategory).delete(deleteCategory);

router.route('/subcategories').post(createSubcategory);
router.route('/subcategories/:id').put(updateSubcategory).delete(deleteSubcategory);

router.route('/breeds').post(createBreed);
router.route('/breeds/:id').put(updateBreed).delete(deleteBreed);

router.route('/age-groups').post(createAgeGroup);
router.route('/age-groups/:id').put(updateAgeGroup).delete(deleteAgeGroup);

export default router;
