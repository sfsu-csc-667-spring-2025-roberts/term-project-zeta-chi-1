// src/middleware/validation.ts

import { body } from 'express-validator';

export const registerValidationRules = () => {
  return [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 5 })
      .withMessage('Password must be at least 5 characters long'),
  ];
};

export const loginValidationRules = () => {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
      body('password')
        .notEmpty()
        .withMessage('Password cannot be empty'),
    ];
  };