import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middlewares/validator';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { CustomerType, CustomerStatus } from '@prisma/client';
import * as customerController from '../controllers/customerController';

const router = Router();

// ==========================================
// 1. ZOD VALIDATION SCHEMAS
// ==========================================

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    mobile: z.string().min(10, 'Mobile must be at least 10 digits').max(15, 'Mobile is too long'),
    email: z.string().email('Invalid email address'),
    businessName: z.string().min(1, 'Business name is required'),
    gstNumber: z.string().optional().nullable(),
    type: z.nativeEnum(CustomerType, { message: 'Invalid customer type' }),
    address: z.string().min(1, 'Address is required'),
    status: z.nativeEnum(CustomerStatus, { message: 'Invalid status' }),
    followUpDate: z.string().datetime({ message: 'Invalid date format (ISO 8601 expected)' }).optional().nullable().or(z.string().optional()),
    notes: z.string().optional().nullable(),
  }),
});

export const updateCustomerSchema = z.object({
  body: createCustomerSchema.shape.body.partial(),
});

// ==========================================
// 2. DEFINE ROUTES (Delegates to Controller)
// ==========================================

// Get all customers (with search & pagination)
router.get('/', authenticateJWT, authorizeRoles(['ADMIN', 'SALES', 'ACCOUNTS']), customerController.getAllCustomers);

// Get single customer details
router.get('/:id', authenticateJWT, authorizeRoles(['ADMIN', 'SALES', 'ACCOUNTS']), customerController.getCustomerById);

// Create new customer
router.post('/', authenticateJWT, authorizeRoles(['ADMIN', 'SALES']), validateRequest(createCustomerSchema), customerController.createCustomer);

// Edit existing customer / Add follow-up notes
router.put('/:id', authenticateJWT, authorizeRoles(['ADMIN', 'SALES']), validateRequest(updateCustomerSchema), customerController.updateCustomer);

export default router;
