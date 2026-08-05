import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require('helmet');
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Global prefix — exclude /health so it's accessible at root
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  // Cookie parser (required for httpOnly refresh token cookies)
  app.use(cookieParser());

  // Security headers (TD-005). Sensible defaults for an API serving a
  // separate frontend origin — CSP is left in report-only-friendly defaults
  // since this API returns JSON, not HTML, and the frontend app defines its
  // own CSP for rendered pages.
  app.use(
    helmet({
      contentSecurityPolicy: false, // JSON API — no HTML to protect via CSP here
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow the separate web origin to consume responses
    }),
  );

  // CORS (TD-006). In production, a missing CORS_ORIGIN is a configuration
  // error, not something we should silently paper over with a localhost
  // fallback — that fallback previously meant a misconfigured deploy would
  // either fail confusingly or, worse, end up more permissive than intended.
  const corsOrigin = process.env.CORS_ORIGIN;
  if (!corsOrigin && process.env.NODE_ENV === 'production') {
    logger.error(
      'CORS_ORIGIN is not set in production. Refusing to start with an implicit localhost fallback. ' +
        'Set CORS_ORIGIN to the production frontend origin (e.g. https://insan-platform.com).',
    );
    process.exit(1);
  }

  app.enableCors({
    origin: corsOrigin || 'http://localhost:5000', // dev-only fallback; unreachable in production due to the guard above
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter (unified error format; never leaks internals — see filter for details)
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 INSAN API running on http://localhost:${port}/api/v1`);
  console.log(`📋 Health check: http://localhost:${port}/health`);
}

bootstrap();
