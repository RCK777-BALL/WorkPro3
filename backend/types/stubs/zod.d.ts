/* eslint-disable @typescript-eslint/no-unused-vars */

export interface ZodIssue {
  message: string;
  path?: Array<string | number>;
  code?: string;
}

export class ZodError<_T = any> extends Error {
  issues: ZodIssue[];
}

export interface ZodSchema<T = any> {
  parse(data: unknown): T;
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: ZodError<T> };
}

export const ZodIssueCode: { custom: 'custom'; [key: string]: string };

export const z: {
  string(): ZodSchema<string>;
  number(): ZodSchema<number>;
  boolean(): ZodSchema<boolean>;
  date(): ZodSchema<Date>;
  any(): ZodSchema<any>;
  unknown(): ZodSchema<unknown>;
  void(): ZodSchema<void>;
  enum<T extends [string, ...string[]]>(values: T): ZodSchema<T[number]>;
  nativeEnum<T extends Record<string, string | number>>(values: T): ZodSchema<T[keyof T]>;
  literal<T extends string | number | boolean>(value: T): ZodSchema<T>;
  array<T>(schema: ZodSchema<T>): ZodSchema<T[]>;
  object<T extends Record<string, ZodSchema<any>>>(shape: T): ZodSchema<{ [K in keyof T]: any }>;
  record(value: ZodSchema<any>): ZodSchema<Record<string, any>>;
  refine<T>(schema: ZodSchema<T>, check: (value: T) => boolean, message?: string): ZodSchema<T>;
  custom<T>(check: (value: unknown) => value is T, message?: string): ZodSchema<T>;
  preprocess<T>(fn: (value: unknown) => unknown, schema: ZodSchema<T>): ZodSchema<T>;
};

export type infer<T extends ZodSchema<any>> = T extends ZodSchema<infer U> ? U : never;

export default z;
