import { Module } from '@nestjs/common';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Module({
  controllers: [BrandsController],
  providers: [BrandsService, AuditInterceptor],
  exports: [BrandsService],
})
export class BrandsModule {}
