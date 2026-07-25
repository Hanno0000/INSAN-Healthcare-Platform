import { Module } from '@nestjs/common';
import { HospitalsController } from './hospitals.controller';
import { HospitalsService } from './hospitals.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Module({
  controllers: [HospitalsController],
  providers: [HospitalsService, AuditInterceptor],
  exports: [HospitalsService],
})
export class HospitalsModule {}
