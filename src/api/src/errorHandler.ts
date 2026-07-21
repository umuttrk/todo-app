import { ErrorRequestHandler } from 'express';
import { ValidationError, errorEnvelope } from './errors';

// docs/ARCHITECTURE.md — Error Handling
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ValidationError) {
    res.status(400).json(errorEnvelope('VALIDATION_ERROR', 'Doğrulama hatası', err.fields));
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json(errorEnvelope('INTERNAL_ERROR', 'Beklenmeyen bir hata oluştu'));
};
