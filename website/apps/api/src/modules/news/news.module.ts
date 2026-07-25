import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Module({
  controllers: [NewsController],
  providers: [NewsService, AuditInterceptor],
  exports: [NewsService],
})
export class NewsModule {}
