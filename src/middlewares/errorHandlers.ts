import { config } from '../config';
import { ApiError } from './apiError';
import { httpStatus } from "../utils";
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config';
import {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error = err;

  // 1️⃣ Prisma Validation Error
  if (err instanceof PrismaClientValidationError) {
    const enumErrorRegex = /Invalid value for argument `(\w+)`\..*?Expected (\w+)\./;
    const match = err.message.match(enumErrorRegex);

    if (match) {
      const fieldName = match[1];
      const expectedEnum = match[2];
      error = new ApiError(
        httpStatus.BAD_REQUEST,
        `Invalid value for '${fieldName}'. Expected a value from enum '${expectedEnum}'.`,
        true,
        { field: fieldName }
      );
    } else {
      error = new ApiError(
        httpStatus.BAD_REQUEST,
        `Validation error: ${
          err.message.split('\n').slice(-1)[0]?.trim() || 'Invalid input format'
        }`,
        true
      );
    }
  }

  // 2️⃣ Prisma Known Request Errors
  else if (err instanceof PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        const fieldMatch = err.meta?.target as string[];
        const fieldName = fieldMatch?.[0] || 'field';
        error = new ApiError(
          httpStatus.CONFLICT,
          `A record with this ${fieldName} already exists.`,
          true,
          { field: fieldName }
        );
        break;
      case 'P2025':
        error = new ApiError(
          httpStatus.NOT_FOUND,
          "We couldn't find what you were looking for",
          true
        );
        break;
      default:
        error = new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          config.env === 'production'
            ? 'A database error occurred. Please try again later.'
            : `Database error: ${err.message}`,
          false
        );
    }
  }

  // 3️⃣ Prisma Unknown Request Error (includes connection closed)
  else if (err instanceof PrismaClientUnknownRequestError) {
    const isConnectionClosed =
      err.message.includes("Server has closed the connection") ||
      err.message.includes("ECONNREFUSED") ||
      err.message.includes("Connection terminated");

    error = new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      config.env === 'production'
        ? isConnectionClosed
          ? 'connection was lost. Please try again later.'
          : 'An unexpected  error occurred.'
        : err.message,
      false,
      config.env === 'development'
        ? { originalError: err.stack || err.message }
        : undefined
    );
  }

  // 4️⃣ Wrap other errors
  if (!(error instanceof ApiError)) {
    error = new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      config.env === 'production'
        ? 'Something went wrong. Please try again later.'
        : err.message || 'Internal server error',
      false,
      config.env === 'development'
        ? { originalError: err.stack || err.message }
        : undefined
    );
  }

  // 5️⃣ Log error internally
  try {
    logger.error(err);
  } catch (logErr) {
    console.error('Logger failed:', logErr);
  }

  // 6️⃣ Build client response
  const response: any = {
    success: false,
    message: error.message,
  };

  if (error.validation) {
    response.validation = true;
    if (error.field) response.field = error.field;
  }

  if (config.env === 'development') {
    if (error.details) response.details = error.details;
    if (error.stack) response.stack = error.stack;
  }

  res.status(error.statusCode || 500).json(response);
};
