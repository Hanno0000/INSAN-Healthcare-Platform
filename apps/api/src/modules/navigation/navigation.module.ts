import { Module } from '@nestjs/common';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Module({
  controllers: [NavigationController],
  providers: [NavigationService, AuditInterceptor],
  exports: [NavigationService],
})
export class NavigationModule {}
