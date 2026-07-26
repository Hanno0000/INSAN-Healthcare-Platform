import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require('helmet');
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { HttpAdapterHost } from '@nestjs/core';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

const PRODUCTION_REQUIRED = [
  'CORS_ORIGIN',
  ...REQUIRED_ENV_VARS,
] as const;

function validateEnvironment() {
  const logger = new Logger('EnvValidation');
  const nodeEnv = process.env.NODE_ENV || 'development';
  const required =
    nodeEnv === 'production' ? PRODUCTION_REQUIRED : REQUIRED_ENV_VARS;

  const missing = required.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    logger.error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
    if (nodeEnv === 'production') {
      logger.error('Refusing to start in production with missing env vars.');
      process.exit(1);
    } else {
      logger.warn('Starting in development mode with missing env vars.');
    }
  }

  if (nodeEnv === 'production') {
    const secrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
    for (const secret of secrets) {
      const val = process.env[secret] || '';
      if (val.includes('change_me') || val.length < 32) {
        logger.error(
          `${secret} appears to be a default/weak value. Regenerate for production.`,
        );
        process.exit(1);
      }
    }
  }
}

const startTime = Date.now();

async function bootstrap() {
  validateEnvironment();

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug'],
  });

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  // Trust first proxy (nginx) — required for correct req.ip, rate limiting, and audit logging
  if (process.env.NODE_ENV === 'production') {
    const { httpAdapter } = app.get(HttpAdapterHost);
    httpAdapter.getInstance().set('trust proxy', 1);
  }

  app.use(cookieParser());

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const corsOrigin = process.env.CORS_ORIGIN;
  if (!corsOrigin && process.env.NODE_ENV === 'production') {
    logger.error(
      'CORS_ORIGIN is not set in production. Refusing to start.',
    );
    process.exit(1);
  }

  app.enableCors({
    origin: corsOrigin || 'http://localhost:5000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  app.enableShutdownHooks();

  const port = process.env.PORT || 4000;
  await app.listen(port);

  const nodeEnv = process.env.NODE_ENV || 'development';
  logger.log(
    `INSAN API started on port ${port} [${nodeEnv}] in ${Date.now() - startTime}ms`,
  );
  logger.log(`Health: http://localhost:${port}/health`);
}

bootstrap();
