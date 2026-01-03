declare module 'express-rate-limit' {
  export interface RateLimitOptions {
    windowMs?: number;
    max?: number | ((...args: any[]) => number);
    message?: string | Record<string, unknown>;
    handler?: (...args: any[]) => any;
    keyGenerator?: (...args: any[]) => string;
    skip?: (...args: any[]) => boolean;
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
  }

  export type RateLimitRequestHandler = (...args: any[]) => any;

  function rateLimit(options?: RateLimitOptions): RateLimitRequestHandler;

  namespace rateLimit {
    function ipKeyGenerator(...args: any[]): string;
  }

  export default rateLimit;
}
