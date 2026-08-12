import { Response, NextFunction } from 'express';
import prisma from '../db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { MovementType } from '@prisma/client';

// A. Get all products (with search & low-stock filter)
export const getAllProducts = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { search, lowStock } = req.query;

  try {
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (lowStock === 'true') {
      where.currentStock = {
        lte: prisma.product.fields.minStockAlert
      };
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.status(200).json({ status: 'success', data: products });
  } catch (error) {
    next(error);
  }
};

// B. Get single product & its movement history
export const getProductById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params as { id: string };

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: { timestamp: 'desc' },
          include: {
            createdBy: {
              select: { name: true, role: true }
            }
          }
        }
      }
    });

    if (!product) {
      res.status(404).json({ status: 'error', message: 'Product not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: product });
  } catch (error) {
    next(error);
  }
};

// C. Add a new product (Auto-logs initial stock movement)
export const createProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { name, sku, category, unitPrice, currentStock, minStockAlert, location } = req.body;
  const userId = req.user!.id;

  try {
    const existingProduct = await prisma.product.findUnique({ where: { sku } });
    if (existingProduct) {
      res.status(400).json({ status: 'error', message: `Product with SKU "${sku}" already exists` });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: { name, sku, category, unitPrice, currentStock, minStockAlert, location },
      });

      if (currentStock > 0) {
        await tx.stockMovementLog.create({
          data: {
            productId: newProduct.id,
            quantityChanged: currentStock,
            movementType: MovementType.IN,
            reason: 'Initial stock setup',
            createdById: userId,
          }
        });
      }

      return newProduct;
    });

    res.status(201).json({ status: 'success', message: 'Product created successfully', data: result });
  } catch (error) {
    next(error);
  }
};

// D. Edit product details (Auto-logs manual stock changes)
export const updateProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params as { id: string };
  const updateData = req.body;
  const userId = req.user!.id;

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      res.status(404).json({ status: 'error', message: 'Product not found' });
      return;
    }

    if (updateData.sku && updateData.sku !== product.sku) {
      const skuConflict = await prisma.product.findUnique({ where: { sku: updateData.sku } });
      if (skuConflict) {
        res.status(400).json({ status: 'error', message: `SKU "${updateData.sku}" is already in use by another product` });
        return;
      }
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      if (updateData.currentStock !== undefined && updateData.currentStock !== product.currentStock) {
        const stockDiff = updateData.currentStock - product.currentStock;
        
        await tx.stockMovementLog.create({
          data: {
            productId: id,
            quantityChanged: Math.abs(stockDiff),
            movementType: stockDiff > 0 ? MovementType.IN : MovementType.OUT,
            reason: updateData.reason || 'Manual stock adjustment',
            createdById: userId,
          }
        });
      }

      return await tx.product.update({
        where: { id },
        data: updateData,
      });
    });

    res.status(200).json({ status: 'success', message: 'Product updated successfully', data: updatedProduct });
  } catch (error) {
    next(error);
  }
};
export const deleteProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params as { id: string };
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      res.status(404).json({ status: 'fail', message: 'Product not found' });
      return;
    }

    await prisma.product.delete({ where: { id } });
    res.status(200).json({ status: 'success', message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getAllStockLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logs = await prisma.stockMovementLog.findMany({
      include: {
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};
