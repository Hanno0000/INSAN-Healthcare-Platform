import { Module } from '@nestjs/common';
import { MedicalCentersController } from './medical-centers.controller';
import { MedicalCentersService } from './medical-centers.service';
import { ClinicsService } from './clinics.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Module({
  controllers: [MedicalCentersController],
  providers: [MedicalCentersService, ClinicsService, AuditInterceptor],
  exports: [MedicalCentersService],
})
export class MedicalCentersModule {}
