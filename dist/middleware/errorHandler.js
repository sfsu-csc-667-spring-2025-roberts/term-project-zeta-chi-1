"use strict";
// src/middleware/errorHandler.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error("Error occurred:", err.stack || err);
    // Determine status code, 500 default
    let statusCode = typeof res.statusCode === 'number' && res.statusCode >= 400 ? res.statusCode : 500;
    if (err.status) { // Specific error handler
        statusCode = err.status;
    }
    res.status(statusCode).json({
        message: err.message || 'An unexpected error occurred on the server.',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined, // Checks for dev node env before returning stack
    }); // Dont include if node env is not dev
};
exports.errorHandler = errorHandler;
