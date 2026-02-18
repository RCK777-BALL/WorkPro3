/* eslint-disable @typescript-eslint/no-unused-vars */

export namespace Types {
  class ObjectId {
    constructor(id?: string);
    toHexString(): string;
  }
}

export interface Document<T = any> extends Record<string, any> {
  _id: Types.ObjectId;
  toObject(): T;
  save(): Promise<this>;
  set(path: string, value: any): this;
}

export interface SchemaDefinition<_T = any> {
  [key: string]: any;
}

export class Schema<T = any> {
  constructor(definition: SchemaDefinition<T>, options?: any);
  static Types: { ObjectId: typeof Types.ObjectId };
  methods: Record<string, any>;
  statics: Record<string, any>;
  index(fields: any, options?: any): this;
  pre(hook: string, fn: (...args: any[]) => void): this;
  post(hook: string, fn: (...args: any[]) => void): this;
}

export interface Model<T = any> {
  new (doc?: Partial<T>): Document<T>;
  find(filter?: any): Promise<T[]>;
  findOne(filter?: any): Promise<T | null>;
  findById(id: any): Promise<T | null>;
  create(doc: any): Promise<T>;
  updateOne(filter: any, update: any, options?: any): Promise<any>;
  deleteOne(filter: any): Promise<any>;
  countDocuments(filter?: any): Promise<number>;
  aggregate<R = any>(pipeline: any[]): Promise<R[]>;
}

export type SchemaDefinitionProperty<_T = any> = any;

export namespace Error {
  class CastError extends global.Error {
    constructor(message?: string);
    message: string;
    path?: string;
  }
  class ValidatorError extends global.Error {
    constructor(message?: string);
    message: string;
  }
  class ValidationError extends global.Error {
    constructor(message?: string);
    message: string;
    errors: Record<string, { message: string }>;
  }
}

export { Error };

export function model<T = any>(name: string, schema?: Schema<T>): Model<T>;
export function connect(uri: string, options?: any): Promise<void>;
export function disconnect(): Promise<void>;
export const connection: any;
export function isValidObjectId(value: any): boolean;

declare const mongoose: {
  Schema: typeof Schema;
  model: typeof model;
  connect: typeof connect;
  disconnect: typeof disconnect;
  connection: typeof connection;
  Types: typeof Types;
  Error: typeof Error;
  isValidObjectId: typeof isValidObjectId;
};

export default mongoose;
