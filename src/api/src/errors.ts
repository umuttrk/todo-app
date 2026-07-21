// docs/ARCHITECTURE.md — Error Handling: tüm hata yanıtları tek bir
// zarf (envelope) kullanır.

export type ValidationFieldErrors = Record<string, string>;

export class ValidationError extends Error {
  fields: ValidationFieldErrors;

  constructor(fields: ValidationFieldErrors) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Kayıt bulunamadı') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export function errorEnvelope(code: string, message: string, fields?: ValidationFieldErrors) {
  return {
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
    },
  };
}
