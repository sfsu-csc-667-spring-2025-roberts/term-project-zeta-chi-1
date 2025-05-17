"use strict";
// src/middleware/validation.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginValidationRules = exports.registerValidationRules = void 0;
const express_validator_1 = require("express-validator");
const registerValidationRules = () => {
    return [
        (0, express_validator_1.body)('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        (0, express_validator_1.body)('password')
            .isLength({ min: 5 })
            .withMessage('Password must be at least 5 characters long'),
    ];
};
exports.registerValidationRules = registerValidationRules;
const loginValidationRules = () => {
    return [
        (0, express_validator_1.body)('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        (0, express_validator_1.body)('password')
            .notEmpty()
            .withMessage('Password cannot be empty'),
    ];
};
exports.loginValidationRules = loginValidationRules;
