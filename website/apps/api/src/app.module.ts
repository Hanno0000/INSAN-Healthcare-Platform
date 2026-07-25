import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
