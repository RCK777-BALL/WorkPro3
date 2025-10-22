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

  export type Express = Application;

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
    class Array<T = any> extends global.Array<T> {}
    class DocumentArray<T = any> extends global.Array<T> {}
    const Mixed: any;
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
  export type SchemaDefinitionProperty<T = any, Doc = any> = any;

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
    exists(filter?: FilterQuery<T>): Promise<{ _id: Types.ObjectId } | null>;
  }

  export interface Document<T = any> extends HydratedDocument<T> {
    save(): Promise<this>;
  }

  export type LeanDocument<T> = T;

  export class Schema<T = any> {
    static Types: {
      ObjectId: typeof Types.ObjectId;
      Array: typeof Types.Array;
      DocumentArray: typeof Types.DocumentArray;
      Mixed: typeof Types.Mixed;
    };
    constructor(definition: any, options?: any);
    methods: Record<string, any>;
    statics: Record<string, any>;
    index(fields: any, options?: any): this;
    pre(hook: string, fn: (...args: any[]) => void): this;
    post(hook: string, fn: (...args: any[]) => void): this;
    virtual(name: string, options?: any): any;
  }
  export function model<T = any>(name: string, schema?: Schema<T>): Model<T>;
  export function connect(uri: string, options?: any): Promise<any>;
  export function disconnect(): Promise<void>;
  export const connection: any;
  export const Types: typeof Types & {
    Array: typeof Types.Array;
    DocumentArray: typeof Types.DocumentArray;
    Mixed: typeof Types.Mixed;
  };
  export function isValidObjectId(value: any): boolean;
  const mongoose: {
    Schema: typeof Schema;
    model: typeof model;
    connect: typeof connect;
    disconnect: typeof disconnect;
    connection: typeof connection;
    Types: typeof Types;
    isValidObjectId: typeof isValidObjectId;
  };
  export default mongoose;
}

declare namespace mongoose {
  namespace Types {
    class ObjectId extends import('mongoose').Types.ObjectId {}
    class Array<T = any> extends import('mongoose').Types.Array<T> {}
    class DocumentArray<T = any> extends import('mongoose').Types.DocumentArray<T> {}
  }
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
  export interface JwtPayload {
    [key: string]: any;
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
    to(room: string): { emit(event: string, ...args: any[]): void };
  }
}

declare module 'passport' {
  export interface Profile {
    id: string;
    displayName?: string;
    emails?: Array<{ value: string }>;
    photos?: Array<{ value: string }>;
    [key: string]: unknown;
  }

  export interface AuthenticateOptions {
    session?: boolean;
    scope?: string | string[];
    callbackURL?: string;
    state?: string;
    [key: string]: unknown;
  }

  export type VerifyCallback = (error: any, user?: any, info?: any) => void;

  export class Strategy {
    name?: string;
    authenticate(req: any, options?: AuthenticateOptions): void;
  }

  export interface PassportStatic {
    use(name: string | Strategy, strategy?: Strategy): this;
    initialize(): any;
    session(): any;
    authenticate(name: string | Strategy | Array<string | Strategy>, options?: AuthenticateOptions): any;
    serializeUser(fn: (user: any, done: VerifyCallback) => void): void;
    deserializeUser(fn: (id: any, done: VerifyCallback) => void): void;
    Strategy: typeof Strategy;
  }

  const passport: PassportStatic;
  export default passport;
  export { Strategy };
}

declare module 'zod' {
  export type ZodTypeAny = any;
  export type ZodSchema<T = any> = {
    parse(data: unknown): T;
    safeParse(data: unknown): { success: true; data: T } | { success: false; error: ZodError<T> };
  } & Record<string, any>;

  export interface ZodIssue {
    message: string;
    path?: Array<string | number>;
    code?: string;
    [key: string]: unknown;
  }

  export class ZodError<T = any> extends Error {
    issues: ZodIssue[];
  }

  export interface ZodEffects<T = any> extends ZodSchema<T> {}

  export const ZodIssueCode: Record<string, string> & { custom: 'custom' };

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
    record(key: ZodSchema<any>, value: ZodSchema<any>): ZodSchema<Record<string, any>>;
    record(value: ZodSchema<any>): ZodSchema<Record<string, any>>;
    union<T extends [ZodSchema<any>, ZodSchema<any>, ...ZodSchema<any>[]]>(schemas: T): ZodSchema<any>;
    discriminatedUnion(discriminator: string, schemas: Array<ZodSchema<any>>): ZodSchema<any>;
    intersection(a: ZodSchema<any>, b: ZodSchema<any>): ZodSchema<any>;
    tuple<T extends ZodSchema<any>[]>(schemas: T): ZodSchema<any>;
    effect<T>(schema: ZodSchema<T>, effect?: any): ZodEffects<T>;
    preprocess(effect: (arg: unknown) => unknown, schema: ZodSchema<any>): ZodSchema<any>;
    nullable<T>(schema: ZodSchema<T>): ZodSchema<T | null>;
    optional<T>(schema: ZodSchema<T>): ZodSchema<T | undefined>;
    coerce: {
      date(): ZodSchema<Date>;
      number(): ZodSchema<number>;
      string(): ZodSchema<string>;
    };
  };

  export type infer<T extends ZodSchema<any>> = T extends ZodSchema<infer U> ? U : never;

  export namespace z {
    export type infer<T extends ZodSchema<any>> = T extends ZodSchema<infer U> ? U : never;
  }
}

declare module 'vitest' {
  export const describe: (name: string, fn: () => Promise<void> | void) => void;
  export const it: (name: string, fn: () => Promise<void> | void) => void;
  export const test: typeof it;
  export const beforeAll: (fn: () => Promise<void> | void) => void;
  export const afterAll: (fn: () => Promise<void> | void) => void;
  export const beforeEach: (fn: () => Promise<void> | void) => void;
  export const afterEach: (fn: () => Promise<void> | void) => void;
  export type MockInstance<T extends (...args: any[]) => any = (...args: any[]) => any> = ((
    ...args: Parameters<T>
  ) => ReturnType<T>) & {
    mockImplementation(fn: T): MockInstance<T>;
    mockImplementationOnce(fn: T): MockInstance<T>;
    mockResolvedValue(value: any): MockInstance<T>;
    mockResolvedValueOnce(value: any): MockInstance<T>;
    mockRejectedValue(value: any): MockInstance<T>;
    mockRejectedValueOnce(value: any): MockInstance<T>;
    mockReturnValue(value: any): MockInstance<T>;
    mockReturnValueOnce(value: any): MockInstance<T>;
    mockClear(): MockInstance<T>;
    mockReset(): MockInstance<T>;
    mockRestore(): void;
    mock: {
      calls: any[][];
      lastCall?: any[];
      results?: any[];
    };
  };
  export type SpyInstance<T extends (...args: any[]) => any = (...args: any[]) => any> = MockInstance<T>;
  export const vi: {
    fn<T extends (...args: any[]) => any>(impl?: T): MockInstance<T>;
    spyOn<T extends Record<string, any>, K extends keyof T>(obj: T, method: K): MockInstance<T[K]>;
    mock(moduleName: string, factory: () => any, options?: any): void;
    mocked<T>(item: T): T;
    useFakeTimers(): void;
    useRealTimers(): void;
    advanceTimersByTime(ms: number): void;
    clearAllMocks(): void;
    resetAllMocks(): void;
    restoreAllMocks(): void;
    resetModules(): void;
    stubGlobal(name: string, value: any): void;
    unstubAllGlobals(): void;
  };
  export const expect: ((value: any) => any) & {
    any(constructor: any): any;
    arrayContaining(values: any[]): any;
    objectContaining(value: any): any;
    stringContaining(value: string): any;
    toHaveBeenCalledWith?: any;
    toBeCalled?: any;
  };
}

declare module 'vitest/config' {
  export function defineConfig(config: any): any;
}

declare module 'winston' {
  const winston: {
    createLogger(options?: any): any;
    transports: Record<string, any>;
    format: Record<string, (...args: any[]) => any>;
  };
  export default winston;
}

declare module 'winston-daily-rotate-file' {
  const DailyRotateFile: any;
  export default DailyRotateFile;
}

declare module 'mongodb-memory-server' {
  export class MongoMemoryServer {
    static create(options?: any): Promise<MongoMemoryServer>;
    getUri(): string;
    stop(): Promise<void>;
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
  import type { RequestHandler } from 'express';
  import type { IncomingMessage, ServerResponse } from 'http';

  export interface StreamOptions {
    write(str: string): void;
  }

  export interface MorganOptions<
    Request extends IncomingMessage = IncomingMessage,
    Response extends ServerResponse = ServerResponse,
  > {
    immediate?: boolean;
    skip?: (req: Request, res: Response) => boolean;
    stream?: StreamOptions;
  }

  export type FormatFn<
    Request extends IncomingMessage = IncomingMessage,
    Response extends ServerResponse = ServerResponse,
  > = (tokens: any, req: Request, res: Response) => string;

  export interface MorganModule {
    <
      Request extends IncomingMessage = IncomingMessage,
      Response extends ServerResponse = ServerResponse,
    >(
      format: string | FormatFn<Request, Response>,
      options?: MorganOptions<Request, Response>,
    ): RequestHandler<Request, Response>;
    token<
      Request extends IncomingMessage = IncomingMessage,
      Response extends ServerResponse = ServerResponse,
    >(
      name: string,
      callback: (req: Request, res: Response) => string,
    ): void;
  }

  const morgan: MorganModule;

  export default morgan;
}
