/*
 * Lightweight module shims used in the kata environment. The production codebase
 * depends on many third-party packages whose full type definitions are not
 * available offline, so we provide minimal declarations that preserve the
 * shapes relied upon by the application. The goal is simply to satisfy the
 * type-checker; the runtime uses the actual packages.
 */

declare module 'express' {
  export type NextFunction = (err?: any) => void;

  export interface Request<
    P = Record<string, string>,
    ResBody = any,
    ReqBody = any,
    ReqQuery = Record<string, any>,
  > {
    params: P extends Record<string, any> ? P : Record<string, string>;
    query: ReqQuery extends Record<string, any> ? ReqQuery : Record<string, any>;
    body: ReqBody;
    ip?: string;
    headers: Record<string, string | string[]>;
    [key: string]: any;
  }

  export interface Response<ResBody = any> {
    locals?: any;
    json(body?: ResBody): Response<ResBody>;
    send(body?: ResBody): Response<ResBody>;
    status(code: number): Response<ResBody>;
    setHeader(name: string, value: string): void;
    header(name: string, value: string): void;
    attachment(filename?: string): Response<ResBody>;
    cookie(name: string, value: string, options?: any): Response<ResBody>;
    clearCookie(name: string, options?: any): Response<ResBody>;
    [key: string]: any;
  }

  export interface RequestHandler<
    P = Record<string, string>,
    ResBody = any,
    ReqBody = any,
    ReqQuery = Record<string, any>,
  > {
    (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction): any;
  }

  export interface Router {
    (...handlers: RequestHandler[]): Router;
    (path: string, ...handlers: RequestHandler[]): Router;
    use(...args: any[]): Router;
    get(...args: any[]): Router;
    post(...args: any[]): Router;
    put(...args: any[]): Router;
    patch(...args: any[]): Router;
    delete(...args: any[]): Router;
    all(...args: any[]): Router;
  }

  export function Router(): Router;

  export interface Application {
    use(...args: any[]): Application;
    get(...args: any[]): any;
    post(...args: any[]): Application;
    put(...args: any[]): Application;
    patch(...args: any[]): Application;
    delete(...args: any[]): Application;
    options(...args: any[]): Application;
    listen(...args: any[]): any;
    set(setting: string, value: any): Application;
  }

  interface ExpressFactory {
    (): Application;
    Router(): Router;
    json(opts?: any): RequestHandler;
    urlencoded(opts?: any): RequestHandler;
    static(root: string, options?: any): RequestHandler;
  }

  const express: ExpressFactory;
  export default express;
}

declare module 'express-serve-static-core' {
  export interface ParamsDictionary {
    [key: string]: string;
  }

  export interface Request<
    P = Record<string, string>,
    ResBody = any,
    ReqBody = any,
    ReqQuery = Record<string, any>,
  > extends import('express').Request<P, ResBody, ReqBody, ReqQuery> {}

  export interface Response<ResBody = any> extends import('express').Response<ResBody> {}
}

declare module 'qs' {
  export interface ParsedQs {
    [key: string]: undefined | string | string[] | ParsedQs | ParsedQs[];
  }
}

declare module 'mongoose' {
  export interface Query<T> extends Promise<T> {
    select(fields: any): Query<T>;
    populate(path: any, select?: any): Query<T>;
    lean<U = T>(): Query<U>;
    limit(n: number): Query<T>;
    sort(sort: any): Query<T>;
    exec(): Promise<T>;
  }

  export namespace Types {
    class ObjectId {
      constructor(id?: string | number | import('crypto').BinaryLike);
      toHexString(): string;
      toString(): string;
      equals(other: any): boolean;
      static isValid(id: any): boolean;
    }
  }

  export namespace Error {
    class ValidationError extends global.Error {
      errors: Record<string, { message: string }>;
    }
  }

  export type UpdateQuery<T> = Partial<T> & Record<string, any>;
  export type FilterQuery<T> = Partial<Record<keyof T, any>> & Record<string, any>;
  export type HydratedDocument<T> = T & {
    _id: Types.ObjectId;
    toObject(): any;
    markModified(path: string): void;
  };
  export type ClientSession = any;

  export interface Model<T = any> {
    new (doc?: Partial<T>): HydratedDocument<T>;
    find(filter?: FilterQuery<T>, projection?: any): Query<T[]>;
    findOne(filter?: FilterQuery<T>, projection?: any): Query<T | null>;
    findById(id: any): Query<T | null>;
    findByIdAndUpdate(id: any, update: UpdateQuery<T>, options?: any): Query<T | null>;
    findByIdAndDelete(id: any): Query<T | null>;
    findOneAndUpdate(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: any): Query<T | null>;
    findOneAndDelete(filter: FilterQuery<T>, options?: any): Query<T | null>;
    countDocuments(filter?: FilterQuery<T>): Promise<number>;
    aggregate(pipeline: any[]): Promise<any[]>;
    updateOne(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: any): Promise<any>;
    updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: any): Promise<any>;
    deleteOne(filter: FilterQuery<T>): Promise<any>;
    deleteMany(filter: FilterQuery<T>): Promise<any>;
    create(doc: any): Promise<T>;
    syncIndexes(): Promise<void>;
    insertMany(docs: any[], options?: any): Promise<T[]>;
  }

  export interface Document<T = any> extends HydratedDocument<T> {
    save(): Promise<this>;
  }

  export type LeanDocument<T> = T;

  export class Schema<T = any> {
    static Types: {
      ObjectId: typeof Types.ObjectId;
      Array: new <U = any>(items?: U[]) => any;
    };
    constructor(definition: any, options?: any);
  }
  export function model<T = any>(name: string, schema?: Schema<T>): Model<T>;
  export function connect(uri: string, options?: any): Promise<any>;
  export const connection: any;
  export const Types: typeof Types & {
    Array: new <U = any>(items?: U[]) => any;
  };
  export function isValidObjectId(value: any): boolean;
  const mongoose: {
    Schema: typeof Schema;
    model: typeof model;
    connect: typeof connect;
    connection: typeof connection;
    Types: typeof Types;
    isValidObjectId: typeof isValidObjectId;
  };
  export default mongoose;
}

declare module 'dotenv' {
  export interface DotenvConfigOptions {
    path?: string;
  }
  export function config(options?: DotenvConfigOptions): void;
}

declare module 'pdfkit' {
  export default class PDFDocument {
    constructor(options?: any);
    fontSize(size: number): this;
    text(text: string, options?: any): this;
    moveDown(lines?: number): this;
    pipe(destination: any): this;
    end(): void;
  }
}

declare module 'json2csv' {
  export class Parser<T = any> {
    constructor(opts?: any);
    parse(data: T[] | T): string;
  }
  export class Transform<T = any> {
    constructor(opts?: any);
    write(chunk: T): void;
  }
  export const ParserOptions: any;
  export type Options<T> = any;
}

declare module 'express-validator' {
  export const validationResult: any;
  export type ValidationError = { msg: string };
  export const body: any;
  export const param: any;
  export const query: any;
  export const checkSchema: any;
}

declare module 'express-rate-limit' {
  export default function rateLimit(opts: any): any;
}

declare module 'bcryptjs' {
  export function hash(data: string, salt: number | string): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
}

declare module 'jsonwebtoken' {
  export interface SignOptions {
    expiresIn?: string | number;
  }
  export function sign(payload: any, secret: string, options?: SignOptions): string;
  export function verify(token: string, secret: string, options?: any): any;
  export const decode: (token: string) => any;
  const jsonwebtoken: {
    sign: typeof sign;
    verify: typeof verify;
    decode: typeof decode;
  };
  export default jsonwebtoken;
}

declare module 'nodemailer' {
  export interface Transporter {
    sendMail(options: any): Promise<any>;
  }
  export function createTransport(options: any): Transporter;
  const nodemailer: {
    createTransport: typeof createTransport;
  };
  export default nodemailer;
}

declare module 'nodemailer/lib/mailer' {
  export interface Options {
    [key: string]: any;
  }
}

declare module 'multer' {
  export interface StorageEngine {
    _handleFile(req: any, file: any, cb: (error?: any, info?: any) => void): void;
    _removeFile(req: any, file: any, cb: (error: Error | null) => void): void;
  }
  export interface MulterOptions {
    storage?: StorageEngine;
    limits?: Record<string, any>;
  }
  export default function multer(options?: MulterOptions): any;
}

declare module 'socket.io' {
  export class Server {
    constructor(httpServer: any, options?: any);
    on(event: string, handler: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
  }
}

declare module 'redis' {
  export interface RedisClientType {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    on(event: string, handler: (...args: any[]) => void): void;
    publish(channel: string, message: string): void;
    subscribe(channel: string): void;
  }
  export function createClient(options?: any): RedisClientType;
}

declare module 'ioredis' {
  export default class Redis {
    constructor(options?: any);
    on(event: string, handler: (...args: any[]) => void): void;
    quit(): Promise<void>;
    publish(channel: string, message: string): void;
    subscribe(channel: string): void;
  }
}

declare module 'kafkajs' {
  export const logLevel: {
    NOTHING: number;
    ERROR: number;
    WARN: number;
    INFO: number;
    DEBUG: number;
  };
  export type logLevel = (typeof logLevel)[keyof typeof logLevel];

  export interface ProducerRecord {
    topic: string;
    messages: Array<{ value: string | Buffer | null; key?: string | Buffer | null }>;
  }

  export interface Producer {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    send(record: ProducerRecord): Promise<unknown>;
  }

  export interface ConsumerSubscribeTopic {
    topic: string;
    fromBeginning?: boolean;
  }

  export interface EachMessagePayload {
    topic: string;
    partition: number;
    message: { value: Buffer | null };
  }

  export interface ConsumerRunConfig {
    eachMessage(payload: EachMessagePayload): Promise<void> | void;
  }

  export interface Consumer {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    subscribe(topic: ConsumerSubscribeTopic): Promise<void>;
    run(config: ConsumerRunConfig): Promise<void>;
  }

  export interface KafkaConfig {
    clientId?: string;
    brokers: string[];
    logLevel?: logLevel;
  }

  export interface ConsumerConfig {
    groupId: string;
  }

  export class Kafka {
    constructor(opts: KafkaConfig);
    consumer(opts: ConsumerConfig): Consumer;
    producer(opts?: unknown): Producer;
  }
}

declare module 'mqtt' {
  export interface IClientOptions {
    clientId?: string;
    username?: string;
    password?: string | Buffer;
    keepalive?: number;
  }

  export interface Client {
    on(event: string, handler: (...args: any[]) => void): void;
    publish(topic: string, message: string | Buffer, options?: any): void;
    subscribe(topic: string, options?: any): void;
    end(force?: boolean, options?: any): void;
  }

  export type MqttClient = Client;

  export function connect(url: string, options?: IClientOptions): MqttClient;

  interface MqttModule {
    connect: typeof connect;
  }

  const mqtt: MqttModule;
  export default mqtt;
}

declare module 'node-cron' {
  export function schedule(expr: string, task: () => void): { stop(): void };
}

declare module 'speakeasy' {
  export function generateSecret(options?: any): any;
  export function totp(options: any): string;
  export function verify(options: any): boolean;
}

declare module 'swagger-jsdoc' {
  export default function swaggerJSDoc(options: any): any;
}

declare module 'swagger-ui-express' {
  export const serve: any;
  export const setup: any;
}

declare module 'csv-parse' {
  export function parse(input: string, options?: any): Promise<any>;
}

declare module 'csv-parse/sync' {
  export interface ParseOptions {
    columns?: boolean | string[];
    skip_empty_lines?: boolean;
    trim?: boolean;
  }

  export function parse(
    input: Buffer | string,
    options?: ParseOptions & { columns?: boolean | string[] },
  ): any[];
}

declare module 'arima' {
  export default function ARIMA(...args: any[]): any;
}

declare module 'pdfkit/js/data' {
  const data: any;
  export default data;
}

declare module 'supertest' {
  const supertest: any;
  export default supertest;
}

declare module 'cors' {
  export interface CorsOptions {
    origin?:
      | boolean
      | string
      | RegExp
      | (string | RegExp)[]
      | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);
    credentials?: boolean;
    allowedHeaders?: string[];
    methods?: string[];
    exposedHeaders?: string[];
  }
  interface CorsFactory {
    (options?: CorsOptions): any;
  }
  const cors: CorsFactory;
  export default cors;
}

declare module 'cookie-parser' {
  export default function cookieParser(secret?: string, options?: any): any;
}

declare module 'helmet' {
  export default function helmet(options?: any): any;
}

declare module 'http' {
  export interface IncomingMessage {
    [key: string]: any;
  }
  export interface ServerResponse {
    [key: string]: any;
    end(chunk?: any): void;
  }
  export function createServer(handler: any): any;
}

declare module 'morgan' {
  export interface MorganOptions {
    skip?: (req: any, res: any) => boolean;
  }
  export default function morgan(format: string, options?: MorganOptions): any;
}
