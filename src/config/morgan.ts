import morgan from 'morgan';
import { Request, Response } from 'express';
import { logger, config } from '.';

// Define message token
morgan.token('message', (req: Request, res: Response) => {
  return res.locals?.errorMessage || '';
});

type LoggerFunction = (message: string) => void;

const getIpFormat = () => (config.env === 'production' ? ':remote-addr - ' : '');

const successFormat = `${getIpFormat()}:method :url :status - :response-time ms`;
const errorFormat = `${getIpFormat()}:method :url :status - :response-time ms - message: :message`;

// Safe logger wrapper
const safeMorgan = (
  format: string,
  skip: (req: Request, res: Response) => boolean,
  logFn: LoggerFunction
) =>
  morgan(format, {
    skip,
    stream: {
      write: (message: string) => {
        try {
          logFn(message.trim());
        } catch (err) {
          console.error('Logging error:', err);
        }
      },
    },
  });

// Final middleware array
const morganMiddleware = [
  safeMorgan(
    successFormat, 
    (_, res) => res.statusCode >= 400, 
    (msg) => logger.info(msg)
  ),
  safeMorgan(
    errorFormat, 
    (_, res) => res.statusCode < 400, 
    (msg) => logger.error(msg)
  ),
];

export { morganMiddleware };