import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';

    // Reuse request ID from the logging interceptor if present
    const requestId =
      (request.headers['x-request-id'] as string) || randomUUID();

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || message;
        if (Array.isArray(message)) {
          message = message[0];
        }
        if (resp.code) code = resp.code;
        else code = HttpStatus[status] || code;
      } else {
        code = HttpStatus[status] || code;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2025': // Record not found
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          code = 'NOT_FOUND';
          break;
        case 'P2002': // Unique constraint violation
          status = HttpStatus.CONFLICT;
          message = 'A record with this value already exists';
          code = 'CONFLICT';
          break;
        case 'P2003': // Foreign key constraint violation
          status = HttpStatus.BAD_REQUEST;
          message = 'Referenced record does not exist';
          code = 'INVALID_REFERENCE';
          break;
        case 'P2014': // Relation violation
          status = HttpStatus.BAD_REQUEST;
          message = 'This operation would violate a required relation';
          code = 'RELATION_VIOLATION';
          break;
        default:
          this.logger.error(
            `[${requestId}] Unhandled Prisma error ${exception.code}: ${exception.message}`,
            exception.stack,
          );
          message = 'Internal server error';
          code = 'INTERNAL_SERVER_ERROR';
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      code = 'VALIDATION_ERROR';
      this.logger.error(`Prisma validation error: ${exception.message}`);
    } else {
      // Never forward raw internal error messages to the client.
      // Full detail (message + stack) is logged server-side only.
      const err = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(`[${requestId}] Unhandled exception: ${err.message}`, err.stack);
      message = 'Internal server error';
      code = 'INTERNAL_SERVER_ERROR';
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        requestId,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
