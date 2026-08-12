import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middlewares/validator';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { ChallanStatus } from '@prisma/client';
import * as challanController from '../controllers/challanController';

const router = Router();

// ==========================================
// 1. ZOD VALIDATION SCHEMAS
// ==========================================

const createChallanSchema = z.object({
  body: z.object({
    customerId: z.string().uuid('Invalid Customer ID format'),
    status: z.nativeEnum(ChallanStatus, { message: 'Invalid challan status' }),
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Invalid Product ID format'),
          quantity: z.number().int().positive('Quantity must be greater than 0'),
        })
      )
      .min(1, 'Challan must contain at least 1 product'),
  }),
});

const updateChallanSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ChallanStatus, { message: 'Invalid status' }),
  }),
});

// ==========================================
// 2. DEFINE ROUTES (Delegates to Controller)
// ==========================================

// Get all challans
router.get('/', authenticateJWT, authorizeRoles(['ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE']), challanController.getAllChallans);

// Get single challan detail (including items)
router.get('/:id', authenticateJWT, authorizeRoles(['ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE']), challanController.getChallanById);

// Create a new challan
router.post('/', authenticateJWT, authorizeRoles(['ADMIN', 'SALES']), validateRequest(createChallanSchema), challanController.createChallan);

// Confirm / update status of a challan
router.put('/:id', authenticateJWT, authorizeRoles(['ADMIN', 'SALES']), validateRequest(updateChallanSchema), challanController.updateChallan);

export default router;
