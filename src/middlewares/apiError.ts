
import { config } from '../config';
import { httpStatus } from "../utils";

export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  details: Record<string, any>;
  validation: boolean;
  field?: string;

  constructor(
    statusCode: number = httpStatus.INTERNAL_SERVER_ERROR,
    message: string = 'Something went wrong',
    isOperational: boolean = true,
    details: Record<string, any> = {},
    validation: boolean = false,
    field?: string,
    stack?: string
  ) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details ?? {};
    this.validation = validation;
    this.field = field;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): object {
    const response: Record<string, any> = {
      status: this.statusCode,
      message: this.message,
    };

    if (config.env === 'development') {
          if (this.details && Object.keys(this.details).length > 0) {
            response.details = this.details;
          }
          if (this.validation) {
            response.validation = true;
          }
          if (this.field) {
            response.field = this.field;
          }
          response.stack = this.stack;
          response.isOperational = this.isOperational;
          response.name = this.name;
        }

    return response;
  }
}