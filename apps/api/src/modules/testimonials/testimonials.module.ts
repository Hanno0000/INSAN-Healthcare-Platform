import { Module } from '@nestjs/common';
import { TestimonialsController } from './testimonials.controller';
import { TestimonialsService } from './testimonials.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Module({
  controllers: [TestimonialsController],
  providers: [TestimonialsService, AuditInterceptor],
  exports: [TestimonialsService],
})
export class TestimonialsModule {}
