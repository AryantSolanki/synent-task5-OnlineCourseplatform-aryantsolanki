const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// ─────────────────────────────────────────────────────────────
// Protect routes - Verify JWT token
// ─────────────────────────────────────────────────────────────
const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        res.status(401);
        throw new Error('Access denied. No token provided.');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            res.status(401);
            throw new Error('Token is invalid - user not found');
        }

        if (!user.isActive) {
            res.status(403);
            throw new Error('Your account has been deactivated');
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            res.status(401);
            throw new Error('Invalid token');
        }
        if (error.name === 'TokenExpiredError') {
            res.status(401);
            throw new Error('Token has expired. Please log in again.');
        }
        throw error;
    }
});

// ─────────────────────────────────────────────────────────────
// Authorize specific roles
// ─────────────────────────────────────────────────────────────
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            res.status(403);
            throw new Error(`Role '${req.user.role}' is not authorized to access this route`);
        }
        next();
    };
};

// ─────────────────────────────────────────────────────────────
// Global Error Handler Middleware
// ─────────────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message || 'Internal Server Error';

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        const messages = Object.values(err.errors).map((e) => e.message);
        message = messages.join(', ');
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyValue)[0];
        message = `An account with this ${field} already exists`;
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired. Please log in again.';
    }

    if (process.env.NODE_ENV === 'development') {
        console.error(`[ERROR] ${statusCode} - ${message}`, err.stack);
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

// ─────────────────────────────────────────────────────────────
// 404 Not Found Handler
// ─────────────────────────────────────────────────────────────
const notFound = (req, res, next) => {
    const error = new Error(`Route not found: ${req.originalUrl}`);
    res.status(404);
    next(error);
};

// ─────────────────────────────────────────────────────────────
// Optional Auth - Attaches req.user if a valid token is present,
// but does NOT block unauthenticated requests. Use on public
// routes that need to distinguish logged-in vs anonymous users.
// ─────────────────────────────────────────────────────────────
const optionalAuth = async (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            if (user && user.isActive) req.user = user;
        } catch (_) {
            // Invalid/expired token — treat as anonymous, do not block
        }
    }
    next();
};

module.exports = { protect, optionalAuth, authorize, errorHandler, notFound };
