import { Router } from 'express';
import { getUserProfile, getUserPets } from '../controllers/user.controller.js';

const router = Router();

router.get('/:id', getUserProfile);
router.get('/:id/pets', getUserPets);

export default router;
