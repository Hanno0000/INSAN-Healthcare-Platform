import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
    // NOTE (Sprint A hardening): this module was previously imported but never
    // actually enforced — no APP_GUARD bound ThrottlerGuard anywhere, so the
    // configured limit below had no effect on real requests. It is now bound
    // globally below. Limit raised from 100 to 300 req/60s per TD-007 (a
    // single admin dashboard page load alone can issue 5-8 requests).
    // Endpoints that need a stricter limit than this default (login, public
    // appointment/contact forms) should use the `@Throttle()` decorator from
    // `@nestjs/throttler` to override it per-route — see AuthController.login
    // and LeadsController for the endpoints where the original spec
    // (`04_API_SPECIFICATION.md` §0.6) calls for tighter limits (5/15min,
    // 5/hour). That per-route tightening is intentionally left as a follow-up
    // rather than bundled here, since it should be tuned against real traffic
    // once the guard is confirmed working end-to-end.
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 300,
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
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
