import { Router } from 'express';
import { getCategoryCounts, getCategories, getBreeds, getAgeGroups } from '../controllers/category.controller.js';

const router = Router();

router.get('/', getCategories);
router.get('/counts', getCategoryCounts);
router.get('/breeds', getBreeds);
router.get('/age-groups', getAgeGroups);

export default router;
