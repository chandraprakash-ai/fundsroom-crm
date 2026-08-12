"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCustomer = exports.createCustomer = exports.getCustomerById = exports.getAllCustomers = void 0;
const db_1 = __importDefault(require("../db"));
// A. Get all customers (with search & pagination)
const getAllCustomers = async (req, res, next) => {
    const { search, type, status, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    try {
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { businessName: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (type)
            where.type = type;
        if (status)
            where.status = status;
        const [customers, totalCount] = await db_1.default.$transaction([
            db_1.default.customer.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
            }),
            db_1.default.customer.count({ where })
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
    }
    catch (error) {
        next(error);
    }
};
exports.getAllCustomers = getAllCustomers;
// B. Get single customer details
const getCustomerById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const customer = await db_1.default.customer.findUnique({
            where: { id },
        });
        if (!customer) {
            res.status(404).json({ status: 'error', message: 'Customer not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: customer });
    }
    catch (error) {
        next(error);
    }
};
exports.getCustomerById = getCustomerById;
// C. Create new customer
const createCustomer = async (req, res, next) => {
    try {
        const customerData = req.body;
        if (customerData.followUpDate) {
            customerData.followUpDate = new Date(customerData.followUpDate);
        }
        const newCustomer = await db_1.default.customer.create({
            data: customerData,
        });
        res.status(201).json({ status: 'success', message: 'Customer created successfully', data: newCustomer });
    }
    catch (error) {
        next(error);
    }
};
exports.createCustomer = createCustomer;
// D. Edit existing customer / Add follow-up notes
const updateCustomer = async (req, res, next) => {
    const { id } = req.params;
    const updateData = req.body;
    try {
        const existingCustomer = await db_1.default.customer.findUnique({ where: { id } });
        if (!existingCustomer) {
            res.status(404).json({ status: 'error', message: 'Customer not found' });
            return;
        }
        if (updateData.followUpDate) {
            updateData.followUpDate = new Date(updateData.followUpDate);
        }
        const updatedCustomer = await db_1.default.customer.update({
            where: { id },
            data: updateData,
        });
        res.status(200).json({ status: 'success', message: 'Customer updated successfully', data: updatedCustomer });
    }
    catch (error) {
        next(error);
    }
};
exports.updateCustomer = updateCustomer;
