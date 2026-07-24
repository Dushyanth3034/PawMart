import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  createAppointment,
  getAppointments,
  updateAppointment,
  cancelAppointment,
  getProviderSchedule,
  confirmServiceCompletion,
  reportServiceIssue,
  respondServiceDispute
} from '../controllers/appointment.controller.js';

const router = Router();

// Protect all routes
router.use(protect);

router.route('/')
  .post(createAppointment)
  .get(getAppointments);

router.route('/:id')
  .put(updateAppointment)
  .patch(updateAppointment)
  .delete(cancelAppointment);

router.patch('/:id/confirm-completion', confirmServiceCompletion);
router.patch('/:id/report-issue', reportServiceIssue);
router.patch('/:id/respond-dispute', respondServiceDispute);

router.get('/provider/:providerId/schedule', getProviderSchedule);

export default router;
