import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middlewares/validator';
import * as authController from '../controllers/authController';

const router = Router();

// 1. Validation Schema
export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

// 2. Define Route (Delegates to Controller)
router.post('/login', validateRequest(loginSchema), authController.login);

export default router;
