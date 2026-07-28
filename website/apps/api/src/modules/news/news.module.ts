import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { FacebookSyncService } from './facebook-sync.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Module({
  imports: [IntegrationsModule],
  controllers: [NewsController],
  providers: [NewsService, FacebookSyncService, AuditInterceptor],
  exports: [NewsService],
})
export class NewsModule {}
