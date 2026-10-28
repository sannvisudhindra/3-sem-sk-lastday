const HTTP_STATUS_MAP = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  SESSION_REVOKED: 401,
  EXISTING_SESSION: 409,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SEAT_TAKEN: 409,
  SOLD_OUT: 409,
  LIMIT_EXCEEDED: 409,
  INVALID_SEATS: 400,
  EVENT_NOT_BOOKABLE: 409,
  NOT_ADMITTED: 403,
  HOLD_EXPIRED: 409,
  HOLD_TOO_SHORT: 409,
  PAYMENT_EXPIRED: 409,
  PAYMENT_NOT_PENDING: 409,
  OTP_INVALID: 400,
  MAX_ATTEMPTS: 409,
  VENUE_CLASH: 409,
  EVENT_CLASH: 409,
  CAPACITY_INVALID: 400,
  RATE_LIMITED: 429,
};

export class AppError extends Error {
  constructor(code, message, details = undefined, statusCode = undefined) {
    super(message || code);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode || HTTP_STATUS_MAP[code] || 500;
  }
}

export function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle known AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // Handle syntax/json parse error
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Malformed JSON payload',
      },
    });
  }

  // Log unexpected errors
  if (req.log) {
    req.log.error(err);
  } else {
    console.error('Unhandled server error:', err);
  }

  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: statusCode === 500 ? 'An unexpected internal error occurred.' : err.message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
}

