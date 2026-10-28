import crypto from 'crypto';

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * Computes sha256(paymentId + ':' + otp) in hex as required by P1's SQL functions.
 */
export function hashOtp(paymentId, otp) {
  return crypto.createHash('sha256').update(`${paymentId}:${otp}`).digest('hex');
}

/**
 * Generates a 32-byte base64url token for QR / email confirm payment links.
 */
export function generatePaymentToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Computes sha256(token) in hex for payment link token storage and lookup.
 */
export function hashPaymentToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

