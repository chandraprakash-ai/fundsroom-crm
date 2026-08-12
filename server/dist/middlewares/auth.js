"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// 1. Token Verification Middleware
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ status: 'error', message: 'Access token is missing or invalid' });
        return;
    }
    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    try {
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        req.user = decoded; // Attach user payload to the request
        next();
    }
    catch (error) {
        res.status(401).json({ status: 'error', message: 'Token is expired or invalid' });
        return;
    }
};
exports.authenticateJWT = authenticateJWT;
// 2. Role-Based Access Control Middleware (RBAC)
const authorizeRoles = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                status: 'error',
                message: `Forbidden: Access restricted to roles: [${allowedRoles.join(', ')}]`
            });
            return;
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
