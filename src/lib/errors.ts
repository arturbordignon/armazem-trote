// Application errors carry an HTTP status and a stable code. Controllers translate them into
// responses in one place (controllers/http.ts); anything else becomes a logged 500.

export type ErrorCode =
  | 'invalid_input'
  | 'not_found'
  | 'conflict'
  | 'out_of_stock'
  | 'rate_limited'
  | 'unauthorized'
  | 'internal';

export type FieldErrors = Readonly<Record<string, readonly string[]>>;

export class AppError extends Error {
  constructor(
    message: string,
    readonly code: ErrorCode,
    readonly status: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    readonly fieldErrors: FieldErrors = {},
  ) {
    super(message, 'invalid_input', 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Nada no paiol com esse nome.') {
    super(message, 'not_found', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'conflict', 409);
  }
}

export class OutOfStockError extends AppError {
  constructor(
    message: string,
    readonly variantIds: readonly number[],
  ) {
    super(message, 'out_of_stock', 409);
  }
}

export class RateLimitedError extends AppError {
  constructor(readonly retryAfterSeconds: number) {
    super(
      'Devagar com o andor, freguês: muitas tentativas. Tente de novo já já.',
      'rate_limited',
      429,
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Credencial inválida.') {
    super(message, 'unauthorized', 401);
  }
}
