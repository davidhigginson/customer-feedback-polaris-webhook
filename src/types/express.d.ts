import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http';

declare module 'express' {
  interface Request extends IncomingMessage {
    body?: unknown;
    headers: IncomingHttpHeaders;
  }

  interface Response extends ServerResponse {
    status(code: number): this;
    json(body: unknown): this;
    send(body: unknown): this;
  }

  type RequestHandler = (req: Request, res: Response, next: NextFunction) => unknown;
  type ErrorRequestHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => unknown;

  type NextFunction = (err?: unknown) => void;

  interface Router {
    use(...handlers: unknown[]): Router;
    get(path: string, ...handlers: RequestHandler[]): Router;
    post(path: string, ...handlers: RequestHandler[]): Router;
  }

  interface Application extends Router {
    listen(port: number, callback?: () => void): unknown;
  }

  interface JsonMiddleware {
    (req: Request, res: Response, next: NextFunction): void;
  }

  interface ExpressModule {
    (): Application;
    Router(): Router;
    json(options?: { limit?: string }): JsonMiddleware;
  }

  const express: ExpressModule;
  export default express;
  export const Router: () => Router;
  export const json: (options?: { limit?: string }) => JsonMiddleware;
  export { Application, Request, Response, NextFunction, RequestHandler, ErrorRequestHandler };
}
