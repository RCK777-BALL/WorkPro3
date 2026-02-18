/* eslint-disable @typescript-eslint/no-unused-vars */

import type { ParsedQs } from './qs';

export interface Request<
  P extends Record<string, string> = Record<string, string>,
  _ResBody = any,
  ReqBody = any,
  ReqQuery extends ParsedQs = ParsedQs
> {
  params: P;
  body: ReqBody;
  query: ReqQuery;
  headers: Record<string, string | string[]>;
  [key: string]: any;
}

export interface Response<ResBody = any> {
  locals: Record<string, any>;
  status(code: number): this;
  json(body?: ResBody): this;
  send(body?: ResBody): this;
  setHeader(name: string, value: string): void;
  header(name: string, value: string): void;
}

export type NextFunction = (err?: any) => void;

export type RequestHandler<
  P extends Record<string, string> = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery extends ParsedQs = ParsedQs
> = (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => any;

export interface Router {
  use(...handlers: any[]): this;
  get(...handlers: any[]): this;
  post(...handlers: any[]): this;
  put(...handlers: any[]): this;
  patch(...handlers: any[]): this;
  delete(...handlers: any[]): this;
}

export interface Application extends Router {
  listen(...args: any[]): any;
}

export interface ExpressFactory {
  (): Application;
  Router(): Router;
  json(...args: any[]): RequestHandler;
  urlencoded(...args: any[]): RequestHandler;
  static(root: string, options?: any): RequestHandler;
}

declare const express: ExpressFactory;
export default express;

export { ParsedQs };
