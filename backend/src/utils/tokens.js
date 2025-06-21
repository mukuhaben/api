import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Generate a short-lived access token (e.g., for login sessions).
 * Payload should include: user ID, email, and role.
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '1d' });
}

/**
 * Generate a random token used for email confirmation.
 */
export function generateConfirmationToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a reset token and expiration time (e.g., for password resets).
 */
export function generateResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  return { token, expiry };
}

/**
 * Generate a long-lived refresh token (can be stored in DB or sent to client).
 */
export function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}


export const signAccess = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
