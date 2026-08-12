"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const login = async (req, res, next) => {
    const { username, password } = req.body;
    try {
        // 1. Find user by username
        const user = await db_1.default.user.findUnique({
            where: { username },
        });
        if (!user) {
            res.status(401).json({ status: 'error', message: 'Invalid username or password' });
            return;
        }
        // 2. Compare password hashes
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({ status: 'error', message: 'Invalid username or password' });
            return;
        }
        // 3. Generate token
        const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            username: user.username,
            role: user.role,
        }, jwtSecret, { expiresIn: '8h' });
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
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
