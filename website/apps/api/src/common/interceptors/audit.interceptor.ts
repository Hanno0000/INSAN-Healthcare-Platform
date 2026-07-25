import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../modules/prisma/prisma.service';

export const AUDIT_ACTION_KEY = 'audit_action';
export const AuditAction = (entity: string, action: string) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(AUDIT_ACTION_KEY, { entity, action }, descriptor.value);
    return descriptor;
  };
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMeta = this.reflector.get(AUDIT_ACTION_KEY, context.getHandler());
    if (!auditMeta) return next.handle();

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return next.handle().pipe(
      tap(async (responseData) => {
        try {
          const entityId =
            responseData?.data?.id ||
            request.params?.id ||
            undefined;

          await this.prisma.auditLog.create({
            data: {
              userId: user?.id,
              action: auditMeta.action,
              entity: auditMeta.entity,
              entityId,
              ipAddress: request.ip,
              after: responseData?.data || null,
            },
          });
        } catch (err) {
          // Non-fatal: audit logging failure should not break the response
          console.error('AuditInterceptor error:', err);
        }
      }),
    );
  }
}
