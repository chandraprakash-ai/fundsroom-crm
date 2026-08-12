"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const customers_1 = __importDefault(require("./routes/customers"));
const products_1 = __importDefault(require("./routes/products"));
const challans_1 = __importDefault(require("./routes/challans"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Global Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Mount Routes
app.use('/api/auth', auth_1.default);
app.use('/api/customers', customers_1.default);
app.use('/api/products', products_1.default);
app.use('/api/challans', challans_1.default);
// Base API Health Route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Server is running smoothly',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// 404 Route Handler
app.use((req, res, next) => {
    res.status(404).json({
        status: 'error',
        message: `Cannot find ${req.originalUrl} on this server`
    });
});
// Global Error Handler Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
        status: 'error',
        message: err.message || 'Internal Server Error'
    });
});
// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
