import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import type { Env } from './config/env.js';

/** Shared by main.ts and the e2e tests so both run the same pipeline. */
export function configureApp(app: NestExpressApplication) {
  app.set('trust proxy', 1); // Railway sits in front of the app; needed for per-IP rate limits
  app.setGlobalPrefix('api/v1');
  // The web app talks to Supabase directly for sign-in, uploads and signed file links.
  const supabase = new URL(
    app.get(ConfigService<Env, true>).get('SUPABASE_URL', { infer: true }),
  ).origin;
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // React style attributes and toast styles
          imgSrc: ["'self'", 'data:', 'blob:', supabase],
          mediaSrc: ["'self'", 'blob:', supabase],
          connectSrc: ["'self'", supabase],
          workerSrc: ["'self'", 'blob:'], // pdf.js worker
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
}
