"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCustomerSchema = exports.createCustomerSchema = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const validator_1 = require("../middlewares/validator");
const auth_1 = require("../middlewares/auth");
const client_1 = require("@prisma/client");
const customerController = __importStar(require("../controllers/customerController"));
const router = (0, express_1.Router)();
// ==========================================
// 1. ZOD VALIDATION SCHEMAS
// ==========================================
exports.createCustomerSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required'),
        mobile: zod_1.z.string().min(10, 'Mobile must be at least 10 digits').max(15, 'Mobile is too long'),
        email: zod_1.z.string().email('Invalid email address'),
        businessName: zod_1.z.string().min(1, 'Business name is required'),
        gstNumber: zod_1.z.string().optional().nullable(),
        type: zod_1.z.nativeEnum(client_1.CustomerType, { message: 'Invalid customer type' }),
        address: zod_1.z.string().min(1, 'Address is required'),
        status: zod_1.z.nativeEnum(client_1.CustomerStatus, { message: 'Invalid status' }),
        followUpDate: zod_1.z.string().datetime({ message: 'Invalid date format (ISO 8601 expected)' }).optional().nullable().or(zod_1.z.string().optional()),
        notes: zod_1.z.string().optional().nullable(),
    }),
});
exports.updateCustomerSchema = zod_1.z.object({
    body: exports.createCustomerSchema.shape.body.partial(),
});
// ==========================================
// 2. DEFINE ROUTES (Delegates to Controller)
// ==========================================
// Get all customers (with search & pagination)
router.get('/', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(['ADMIN', 'SALES', 'ACCOUNTS']), customerController.getAllCustomers);
// Get single customer details
router.get('/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(['ADMIN', 'SALES', 'ACCOUNTS']), customerController.getCustomerById);
// Create new customer
router.post('/', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(['ADMIN', 'SALES']), (0, validator_1.validateRequest)(exports.createCustomerSchema), customerController.createCustomer);
// Edit existing customer / Add follow-up notes
router.put('/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(['ADMIN', 'SALES']), (0, validator_1.validateRequest)(exports.updateCustomerSchema), customerController.updateCustomer);
exports.default = router;
