import { AppError } from './errorHandler.js';

/**
 * Zod validation middleware generator.
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} [source='body'] - Request property to validate
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return next(new AppError('VALIDATION_ERROR', 'Validation failed', { issues: details }));
    }
    req[source] = result.data;
    next();
  };
}
