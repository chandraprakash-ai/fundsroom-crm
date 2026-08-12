import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { username, password } = req.body;

  try {
    // 1. Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      res.status(401).json({ status: 'error', message: 'Invalid username or password' });
      return;
    }

    // 2. Compare password hashes
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ status: 'error', message: 'Invalid username or password' });
      return;
    }

    // 3. Generate token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: '8h' }
    );

    // 4. Send response
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
