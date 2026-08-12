import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middlewares/validator';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import * as productController from '../controllers/productController';

const router = Router();

// ==========================================
// 1. ZOD VALIDATION SCHEMAS
// ==========================================

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Product name is required'),
    sku: z.string().min(1, 'SKU code is required'),
    category: z.string().min(1, 'Category is required'),
    unitPrice: z.number().min(0, 'Unit price cannot be negative'),
    currentStock: z.number().int().min(0, 'Stock cannot be negative'),
    minStockAlert: z.number().int().min(0, 'Minimum stock alert quantity cannot be negative'),
    location: z.string().min(1, 'Location is required'),
  }),
});

export const updateProductSchema = z.object({
  body: createProductSchema.shape.body.partial(),
});

// ==========================================
// 2. DEFINE ROUTES (Delegates to Controller)
// ==========================================

// Get all products (with search & low-stock filter)
router.get('/', authenticateJWT, authorizeRoles(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']), productController.getAllProducts);

// Get single product & its movement history
router.get('/:id', authenticateJWT, authorizeRoles(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']), productController.getProductById);

// Add a new product
router.post('/', authenticateJWT, authorizeRoles(['ADMIN', 'WAREHOUSE']), validateRequest(createProductSchema), productController.createProduct);

// Edit product details & stock
router.put('/:id', authenticateJWT, authorizeRoles(['ADMIN', 'WAREHOUSE']), validateRequest(updateProductSchema), productController.updateProduct);

export default router;
