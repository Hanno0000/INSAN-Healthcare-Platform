import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from './modules/prisma/prisma.service';

const APP_VERSION = '1.0.0';
const startedAt = Date.now();

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health(@Res() res: Response) {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - startedAt) / 1000);

    let databaseStatus: 'ok' | 'error' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = 'error';
    }

    const isHealthy = databaseStatus === 'ok';
    const status = isHealthy ? 'ok' : 'degraded';

    res.status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status,
      service: 'insan-api',
      version: APP_VERSION,
      timestamp,
      uptime: `${uptime}s`,
      environment: process.env.NODE_ENV || 'development',
      memory: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
        heap: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      },
      checks: {
        database: databaseStatus,
      },
    });
  }
}
