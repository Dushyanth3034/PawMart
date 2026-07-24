import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  getWalletDetails,
  getWalletTransactions,
  requestWithdrawal,
  getPayoutHistory
} from '../controllers/wallet.controller.js';

const router = Router();

// Protect all wallet routes
router.use(protect);

router.get('/', getWalletDetails);
router.get('/transactions', getWalletTransactions);
router.post('/withdraw', requestWithdrawal);
router.get('/payouts', getPayoutHistory);

export default router;
