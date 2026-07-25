import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, AuditInterceptor],
  exports: [SettingsService],
})
export class SettingsModule {}
