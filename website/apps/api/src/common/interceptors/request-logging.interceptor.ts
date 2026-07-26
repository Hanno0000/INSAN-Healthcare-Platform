import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = randomUUID();
    const start = Date.now();

    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const userId = (req as any).user?.id || '-';
        const log = {
          requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          userId,
          ip: req.ip,
        };

        if (res.statusCode >= 500) {
          this.logger.error(JSON.stringify(log));
        } else if (res.statusCode >= 400) {
          this.logger.warn(JSON.stringify(log));
        } else {
          this.logger.log(JSON.stringify(log));
        }
      }),
    );
  }
}
