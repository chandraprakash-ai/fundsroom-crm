"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProduct = exports.createProduct = exports.getProductById = exports.getAllProducts = void 0;
const db_1 = __importDefault(require("../db"));
const client_1 = require("@prisma/client");
// A. Get all products (with search & low-stock filter)
const getAllProducts = async (req, res, next) => {
    const { search, lowStock } = req.query;
    try {
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (lowStock === 'true') {
            where.currentStock = {
                lte: db_1.default.product.fields.minStockAlert
            };
        }
        const products = await db_1.default.product.findMany({
            where,
            orderBy: { name: 'asc' },
        });
        res.status(200).json({ status: 'success', data: products });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllProducts = getAllProducts;
// B. Get single product & its movement history
const getProductById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const product = await db_1.default.product.findUnique({
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
    }
    catch (error) {
        next(error);
    }
};
exports.getProductById = getProductById;
// C. Add a new product (Auto-logs initial stock movement)
const createProduct = async (req, res, next) => {
    const { name, sku, category, unitPrice, currentStock, minStockAlert, location } = req.body;
    const userId = req.user.id;
    try {
        const existingProduct = await db_1.default.product.findUnique({ where: { sku } });
        if (existingProduct) {
            res.status(400).json({ status: 'error', message: `Product with SKU "${sku}" already exists` });
            return;
        }
        const result = await db_1.default.$transaction(async (tx) => {
            const newProduct = await tx.product.create({
                data: { name, sku, category, unitPrice, currentStock, minStockAlert, location },
            });
            if (currentStock > 0) {
                await tx.stockMovementLog.create({
                    data: {
                        productId: newProduct.id,
                        quantityChanged: currentStock,
                        movementType: client_1.MovementType.IN,
                        reason: 'Initial stock setup',
                        createdById: userId,
                    }
                });
            }
            return newProduct;
        });
        res.status(201).json({ status: 'success', message: 'Product created successfully', data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.createProduct = createProduct;
// D. Edit product details (Auto-logs manual stock changes)
const updateProduct = async (req, res, next) => {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;
    try {
        const product = await db_1.default.product.findUnique({ where: { id } });
        if (!product) {
            res.status(404).json({ status: 'error', message: 'Product not found' });
            return;
        }
        if (updateData.sku && updateData.sku !== product.sku) {
            const skuConflict = await db_1.default.product.findUnique({ where: { sku: updateData.sku } });
            if (skuConflict) {
                res.status(400).json({ status: 'error', message: `SKU "${updateData.sku}" is already in use by another product` });
                return;
            }
        }
        const updatedProduct = await db_1.default.$transaction(async (tx) => {
            if (updateData.currentStock !== undefined && updateData.currentStock !== product.currentStock) {
                const stockDiff = updateData.currentStock - product.currentStock;
                await tx.stockMovementLog.create({
                    data: {
                        productId: id,
                        quantityChanged: Math.abs(stockDiff),
                        movementType: stockDiff > 0 ? client_1.MovementType.IN : client_1.MovementType.OUT,
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
    }
    catch (error) {
        next(error);
    }
};
exports.updateProduct = updateProduct;
