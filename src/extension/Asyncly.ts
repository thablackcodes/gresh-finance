import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export function Asyncly(fn: AsyncRequestHandler): RequestHandler {
	return (req, res, next) => {
		fn(req, res, next).catch(next);
	};
}
