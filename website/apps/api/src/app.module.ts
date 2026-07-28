import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { HospitalsModule } from './modules/hospitals/hospitals.module';
import { MedicalCentersModule } from './modules/medical-centers/medical-centers.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { PagesModule } from './modules/pages/pages.module';
import { NewsModule } from './modules/news/news.module';
import { SettingsModule } from './modules/settings/settings.module';
import { NavigationModule } from './modules/navigation/navigation.module';
import { TestimonialsModule } from './modules/testimonials/testimonials.module';
import { LeadsModule } from './modules/leads/leads.module';
import { UsersModule } from './modules/users/users.module';
import { BrandsModule } from './modules/brands/brands.module';
import { AuditModule } from './modules/audit/audit.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { InvestorsModule } from './modules/investors/investors.module';
import { AiModule } from './modules/ai/ai.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    HospitalsModule,
    MedicalCentersModule,
    DoctorsModule,
    PagesModule,
    NewsModule,
    SettingsModule,
    NavigationModule,
    TestimonialsModule,
    LeadsModule,
    UsersModule,
    BrandsModule,
    AuditModule,
    IntegrationsModule,
    InvestorsModule,
    AiModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
