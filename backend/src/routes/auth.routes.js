import { Router } from 'express';
import { register, login, refresh, logout, changePassword, forgotPassword, verifyOtp, resetPassword, googleLogin } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

// Protected routes
router.use(protect);
router.put('/password/change', changePassword);

export default router;
