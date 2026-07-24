import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  createPet,
  getPets,
  getPetById,
  updatePet,
  deletePet,
} from '../controllers/pet.controller.js';

const router = Router();

// Protect all routes
router.use(protect);

router.route('/')
  .post(createPet)
  .get(getPets);

router.route('/:id')
  .get(getPetById)
  .put(updatePet)
  .delete(deletePet);

export default router;
