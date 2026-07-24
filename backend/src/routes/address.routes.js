import { Router } from 'express';
import { getAddresses, addAddress, setDefaultAddress, deleteAddress } from '../controllers/address.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect); // All address routes require authentication

router.route('/')
  .get(getAddresses)
  .post(addAddress);

router.route('/:id/default')
  .put(setDefaultAddress);

router.route('/:id')
  .delete(deleteAddress);

export default router;
