import { Module } from '@nestjs/common';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Module({
  controllers: [DoctorsController],
  providers: [DoctorsService, AuditInterceptor],
  exports: [DoctorsService],
})
export class DoctorsModule {}
