import pino from 'pino';

function maskSensitive(value: string): string {
  // Handle email addresses
  value = value.replace(/\b([A-Z0-9._%+-]{2})[A-Z0-9._%+-]*@/gi, '$1***@');
  value = value.replace(/\b(\+\d{1,3}[- ]?)?(\d{2})(\d+)(\d{2})\b/g, '$1$2***$4');
  value = value.replace(/\b(\d{2})\d+\b/g, '$1***');
  value = value.replace(/\b(23[34]\d{3})\d{3}(\d{3})\b/g, '$1***$2');
  return value;
}

function deepMaskSensitive(obj: any): any {
  if (typeof obj === 'string') return maskSensitive(obj);
  if (Array.isArray(obj)) return obj.map(deepMaskSensitive);
  if (obj && typeof obj === 'object') {
    const masked: Record<string, any> = {};
    for (const key in obj) masked[key] = deepMaskSensitive(obj[key]);
    return masked;
  }
  return obj;
}

// Create base logger
const baseLogger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
  formatters: {
    log(object) {
      return deepMaskSensitive(object);
    },
  },
});

type LogMethod = 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'fatal';

const createSafeLogger = () => {
  const methods: LogMethod[] = ['info', 'warn', 'error', 'debug', 'trace', 'fatal'];
  
  return methods.reduce((logger, method) => {
    logger[method] = (message: string, ...args: any[]) => {
      const safeArgs = args.map(arg => {
        if (arg === undefined) return 'undefined';
        if (arg === null) return 'null';
        if (typeof arg === 'string') return maskSensitive(arg);
        return deepMaskSensitive(arg);
      });
      baseLogger[method](message, ...safeArgs);
    };
    return logger;
  }, {} as Record<LogMethod, (message: string, ...args: any[]) => void>);
};

const logger = createSafeLogger();

export { logger };
