import { Response, NextFunction } from 'express';
import prisma from '../db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { ChallanStatus, MovementType } from '@prisma/client';

// Helper to generate a unique Challan number (e.g. CH-2026-0001)
const generateChallanNumber = async (): Promise<string> => {
  const count = await prisma.challan.count();
  const nextNumber = String(count + 1).padStart(4, '0');
  const year = new Date().getFullYear();
  return `CH-${year}-${nextNumber}`;
};

// A. Get all challans
export const getAllChallans = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const challans = await prisma.challan.findMany({
      include: {
        customer: { select: { name: true, businessName: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ status: 'success', data: challans });
  } catch (error) {
    next(error);
  }
};

// B. Get single challan detail (including snapshotted products)
export const getChallanById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params as { id: string };

  try {
    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { name: true, role: true } },
        items: true,
      },
    });

    if (!challan) {
      res.status(404).json({ status: 'error', message: 'Challan not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: challan });
  } catch (error) {
    next(error);
  }
};

// C. Create a Challan (Draft or Confirmed)
export const createChallan = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { customerId, status, items } = req.body; // items: Array of { productId, quantity }
  const userId = req.user!.id;

  try {
    // 1. Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      res.status(400).json({ status: 'error', message: 'Customer not found' });
      return;
    }

    // 2. Fetch all products involved to check prices and stock
    const productIds = items.map((item: any) => item.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    // Match requested items with database products and generate snapshots
    const lineItemsData = items.map((item: any) => {
      const product = dbProducts.find((p) => p.id === item.productId);
      if (!product) {
        throw new Error(`Product ID ${item.productId} not found in catalog`);
      }
      return {
        productId: item.productId,
        quantity: item.quantity,
        priceSnapshot: product.unitPrice,
        nameSnapshot: product.name,
        skuSnapshot: product.sku,
        // Helper reference to database product for stock check
        _dbProduct: product,
      };
    });

    const challanNumber = await generateChallanNumber();
    const totalQuantity = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

    // 3. EXECUTE IN TRANSACTION
    const result = await prisma.$transaction(async (tx) => {
      // A. If CONFIRMED, check and reduce stock
      if (status === ChallanStatus.CONFIRMED) {
        for (const item of lineItemsData) {
          const product = item._dbProduct;
          if (product.currentStock < item.quantity) {
            throw new Error(`Insufficient stock for product "${product.name}". Available: ${product.currentStock}, Requested: ${item.quantity}`);
          }

          // Deduct stock
          await tx.product.update({
            where: { id: product.id },
            data: { currentStock: { decrement: item.quantity } },
          });

          // Log stock movement
          await tx.stockMovementLog.create({
            data: {
              productId: product.id,
              quantityChanged: item.quantity,
              movementType: MovementType.OUT,
              reason: `Sales Challan ${challanNumber} Confirmed`,
              createdById: userId,
            },
          });
        }
      }

      // B. Create the Challan and its items
      const newChallan = await tx.challan.create({
        data: {
          challanNumber,
          customerId,
          totalQuantity,
          status,
          createdById: userId,
          items: {
            create: lineItemsData.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceSnapshot: item.priceSnapshot,
              nameSnapshot: item.nameSnapshot,
              skuSnapshot: item.skuSnapshot,
            })),
          },
        },
        include: { items: true },
      });

      return newChallan;
    });

    res.status(201).json({ status: 'success', message: `Challan created as ${status}`, data: result });
  } catch (error: any) {
    // If it's our custom stock error, return 400 Bad Request
    if (error.message && error.message.includes('Insufficient stock')) {
      res.status(400).json({ status: 'error', message: error.message });
      return;
    }
    next(error);
  }
};

// D. Edit / Confirm a Draft Challan
export const updateChallan = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params as { id: string };
  const { status } = req.body;
  const userId = req.user!.id;

  try {
    const challan = await prisma.challan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      res.status(404).json({ status: 'error', message: 'Challan not found' });
      return;
    }

    if (challan.status !== ChallanStatus.DRAFT) {
      res.status(400).json({ status: 'error', message: `Cannot modify a challan that is already ${challan.status}` });
      return;
    }

    // Process update in transaction
    const result = await prisma.$transaction(async (tx) => {
      // If moving from DRAFT to CONFIRMED, check and deduct stock
      if (status === ChallanStatus.CONFIRMED) {
        for (const item of challan.items) {
          if (!item.productId) {
            throw new Error(`Cannot confirm: Product in line item no longer exists in catalog`);
          }

          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product || product.currentStock < item.quantity) {
            const prodName = product ? product.name : item.nameSnapshot;
            const available = product ? product.currentStock : 0;
            throw new Error(`Insufficient stock for product "${prodName}". Available: ${available}, Requested: ${item.quantity}`);
          }

          // Deduct stock
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: item.quantity } },
          });

          // Log stock movement
          await tx.stockMovementLog.create({
            data: {
              productId: item.productId,
              quantityChanged: item.quantity,
              movementType: MovementType.OUT,
              reason: `Sales Challan ${challan.challanNumber} Confirmed`,
              createdById: userId,
            },
          });
        }
      }

      // Update status
      return await tx.challan.update({
        where: { id },
        data: { status },
        include: { items: true },
      });
    });

    res.status(200).json({ status: 'success', message: `Challan updated to ${status}`, data: result });
  } catch (error: any) {
    if (error.message && error.message.includes('Insufficient stock')) {
      res.status(400).json({ status: 'error', message: error.message });
      return;
    }
    next(error);
  }
};
