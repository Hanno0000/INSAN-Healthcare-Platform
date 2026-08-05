import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from './modules/prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health(@Res() res: Response) {
    const timestamp = new Date().toISOString();

    // Sprint A hardening: previously this endpoint returned a static 200
    // regardless of whether the database (or anything else the API depends
    // on) was actually reachable — not useful as a real readiness probe.
    let databaseStatus: 'ok' | 'error' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = 'error';
    }

    const isHealthy = databaseStatus === 'ok';

    res.status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: isHealthy ? 'ok' : 'degraded',
      service: 'insan-api',
      timestamp,
      checks: {
        database: databaseStatus,
      },
    });
  }
}
