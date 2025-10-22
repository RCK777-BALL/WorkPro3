/*
 * Minimal Node.js global declarations for environments without @types/node.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }

  interface Process {
    env: ProcessEnv;
    cwd(): string;
    exit(code?: number): never;
    uptime(): number;
    memoryUsage(): {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers?: number;
    };
  }

  interface WritableStream {
    write(chunk: any, encoding?: string, cb?: () => void): boolean;
    end(chunk?: any, encoding?: string, cb?: () => void): void;
  }

  interface Timeout {}
  interface Immediate {}
}

declare const process: NodeJS.Process;
declare const __dirname: string;
interface NodeRequire {
  (id: string): any;
  resolve(id: string): string;
  main?: { filename: string } | undefined;
}
declare const require: NodeRequire;
declare const module: { exports: any; filename?: string };

declare function setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): NodeJS.Timeout;
declare function clearTimeout(timeout: NodeJS.Timeout): void;
declare function setInterval(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): NodeJS.Timeout;
declare function clearInterval(timeout: NodeJS.Timeout): void;
declare function setImmediate(handler: (...args: any[]) => void, ...args: any[]): NodeJS.Immediate;

declare class Buffer {
  constructor(str: string | ArrayBuffer | Uint8Array, encoding?: string);
  static from(data: string | ArrayBuffer | Uint8Array, encoding?: string): Buffer;
  static alloc(size: number, fill?: string | number, encoding?: string): Buffer;
  toString(encoding?: string): string;
}

declare module 'fs' {
  export interface Stats {
    isDirectory(): boolean;
  }
  export const promises: {
    readFile(path: string, encoding?: string): Promise<string>;
    writeFile(path: string, data: string | Uint8Array, encoding?: string): Promise<void>;
    mkdir(path: string, opts?: any): Promise<void>;
    stat(path: string): Promise<Stats>;
    unlink(path: string): Promise<void>;
    readdir(path: string): Promise<string[]>;
    access(path: string, mode?: number): Promise<void>;
  } & Record<string, (...args: any[]) => Promise<any>>;
  export function readFileSync(path: string, encoding?: string): string;
  export function writeFileSync(path: string, data: string | Uint8Array, encoding?: string): void;
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, opts?: any): void;
  export function createReadStream(path: string): any;
  export function createWriteStream(path: string): any;
}

declare module 'fs/promises' {
  export const readFile: (path: string, encoding?: string) => Promise<string>;
  export const writeFile: (path: string, data: string | Uint8Array, encoding?: string) => Promise<void>;
  export const mkdir: (path: string, opts?: any) => Promise<void>;
  export const stat: (path: string) => Promise<import('fs').Stats>;
  export const unlink: (path: string) => Promise<void>;
  export const readdir: (path: string) => Promise<string[]>;
  export const access: (path: string, mode?: number) => Promise<void>;
  const promises: Record<string, (...args: any[]) => Promise<any>>;
  export default promises;
}

declare module 'path' {
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
  export function dirname(path: string): string;
}

declare module 'stream' {
  export class Readable {
    static from(iterable: Iterable<any>): Readable;
    pipe(destination: any): any;
  }
}

declare module 'crypto' {
  export function randomUUID(): string;
  export function randomBytes(size: number): { toString(encoding?: string): string };
  export function createHmac(algo: string, secret: string): { update(data: string): any; digest(encoding?: string): string };
  export function createHash(algo: string): { update(data: string): any; digest(encoding?: string): string };
}

declare module 'events' {
  export class EventEmitter {
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    off(event: string | symbol, listener: (...args: any[]) => void): this;
    emit(event: string | symbol, ...args: any[]): boolean;
    removeAllListeners(event?: string | symbol): this;
  }
  export default EventEmitter;
}

declare function fetch(input: any, init?: any): Promise<{
  ok: boolean;
  status: number;
  json(): Promise<any>;
  text(): Promise<string>;
  headers: { get(name: string): string | null };
}>;

declare module 'os' {
  export function loadavg(): number[];
  export function totalmem(): number;
  export function freemem(): number;
  export function cpus(): Array<{ model: string; speed: number; times: Record<string, number> }>;
  export function hostname(): string;
  export function platform(): string;
}
