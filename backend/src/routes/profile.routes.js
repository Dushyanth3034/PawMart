import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.middleware.js';
import { getProfile, updateProfile, uploadAvatar, deleteAvatar } from '../controllers/profile.controller.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

router.route('/')
  .get(protect, getProfile)
  .put(protect, updateProfile);

router.route('/image')
  .post(protect, upload.single('image'), uploadAvatar)
  .delete(protect, deleteAvatar);

export default router;
