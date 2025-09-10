 export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function assertEmail(v: unknown): asserts v is string {
  if (typeof v !== 'string' || v.trim() === '') {
    throw new Error('Email is required and must be a non-empty string');
  }
}
 
