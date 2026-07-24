import express from 'express';
import { searchProducts, searchPets, searchServices, getProductById, getServiceCategories } from '../controllers/search.controller.js';

const router = express.Router();

router.get('/', searchProducts);
router.get('/products', searchProducts);
router.get('/products/:id', getProductById);
router.get('/pets', searchPets);
router.get('/services/categories', getServiceCategories);
router.get('/services', searchServices);

export default router;
