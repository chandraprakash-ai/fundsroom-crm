import { Response, NextFunction } from 'express';
import prisma from '../db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { CustomerType, CustomerStatus } from '@prisma/client';

// A. Get all customers (with search & pagination)
export const getAllCustomers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { search, type, status, page = '1', limit = '10' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  try {
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { businessName: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    if (type) where.type = type as CustomerType;
    if (status) where.status = status as CustomerStatus;

    const [customers, totalCount] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where })
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        customers,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// B. Get single customer details
export const getCustomerById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params as { id: string };

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      res.status(404).json({ status: 'error', message: 'Customer not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: customer });
  } catch (error) {
    next(error);
  }
};

// C. Create new customer
export const createCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customerData = req.body;
    
    if (customerData.followUpDate) {
      customerData.followUpDate = new Date(customerData.followUpDate);
    }

    const newCustomer = await prisma.customer.create({
      data: customerData,
    });

    res.status(201).json({ status: 'success', message: 'Customer created successfully', data: newCustomer });
  } catch (error) {
    next(error);
  }
};

// D. Edit existing customer / Add follow-up notes
export const updateCustomer = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params as { id: string };
  const updateData = req.body;

  try {
    const existingCustomer = await prisma.customer.findUnique({ where: { id } });
    if (!existingCustomer) {
      res.status(404).json({ status: 'error', message: 'Customer not found' });
      return;
    }

    if (updateData.followUpDate) {
      updateData.followUpDate = new Date(updateData.followUpDate);
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({ status: 'success', message: 'Customer updated successfully', data: updatedCustomer });
  } catch (error) {
    next(error);
  }
};
