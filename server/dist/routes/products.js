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
exports.updateProductSchema = exports.createProductSchema = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const validator_1 = require("../middlewares/validator");
const auth_1 = require("../middlewares/auth");
const productController = __importStar(require("../controllers/productController"));
const router = (0, express_1.Router)();
// ==========================================
// 1. ZOD VALIDATION SCHEMAS
// ==========================================
exports.createProductSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Product name is required'),
        sku: zod_1.z.string().min(1, 'SKU code is required'),
        category: zod_1.z.string().min(1, 'Category is required'),
        unitPrice: zod_1.z.number().min(0, 'Unit price cannot be negative'),
        currentStock: zod_1.z.number().int().min(0, 'Stock cannot be negative'),
        minStockAlert: zod_1.z.number().int().min(0, 'Minimum stock alert quantity cannot be negative'),
        location: zod_1.z.string().min(1, 'Location is required'),
    }),
});
exports.updateProductSchema = zod_1.z.object({
    body: exports.createProductSchema.shape.body.partial(),
});
// ==========================================
// 2. DEFINE ROUTES (Delegates to Controller)
// ==========================================
// Get all products (with search & low-stock filter)
router.get('/', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']), productController.getAllProducts);
// Get single product & its movement history
router.get('/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']), productController.getProductById);
// Add a new product
router.post('/', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(['ADMIN', 'WAREHOUSE']), (0, validator_1.validateRequest)(exports.createProductSchema), productController.createProduct);
// Edit product details & stock
router.put('/:id', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(['ADMIN', 'WAREHOUSE']), (0, validator_1.validateRequest)(exports.updateProductSchema), productController.updateProduct);
exports.default = router;
