import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, AuditInterceptor],
  exports: [LeadsService],
})
export class LeadsModule {}
