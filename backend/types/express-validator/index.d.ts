declare module 'express-validator' {
  export interface ValidationError {
    msg: string;
    param: string;
    location: string;
    value?: unknown;
  }

  export interface Result<T> {
    array(): T[];
    isEmpty(): boolean;
  }

  export function validationResult(req: unknown): Result<ValidationError>;

  export interface ValidationChain {
    optional(): ValidationChain;
    isString(): ValidationChain;
    isEmail(): ValidationChain;
    isBoolean(): ValidationChain;
    isInt(options?: Record<string, unknown>): ValidationChain;
    isMongoId(): ValidationChain;
    isISO8601(): ValidationChain;
    isFloat(options?: Record<string, unknown>): ValidationChain;
    isIn(values: readonly unknown[]): ValidationChain;
    notEmpty(): ValidationChain;
    bail(): ValidationChain;
    toDate(): ValidationChain;
    toFloat(): ValidationChain;
    toInt(): ValidationChain;
    custom(
      validator: (value: unknown, meta: { req: unknown }) => unknown
    ): ValidationChain;
    withMessage(message: string): ValidationChain;
  }

  export function body(field?: string): ValidationChain;
  export function param(field: string): ValidationChain;
  export function query(field: string): ValidationChain;
}
