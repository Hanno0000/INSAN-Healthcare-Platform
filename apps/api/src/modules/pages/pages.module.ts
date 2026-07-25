import { Module } from '@nestjs/common';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { SectionsService } from './sections.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Module({
  controllers: [PagesController],
  providers: [PagesService, SectionsService, AuditInterceptor],
  exports: [PagesService],
})
export class PagesModule {}
