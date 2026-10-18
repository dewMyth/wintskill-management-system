import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import type { ServerResponse } from 'node:http';

/** The built web app (apps/web/dist), relative to this file in both src/ and dist/. */
const WEB_DIST = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'web',
  'dist',
);

/**
 * In production one service serves the API and the web app. Every non-/api path gets
 * index.html (the app's own router takes over), so deep links survive a refresh.
 * Hashed assets are cached for a year; index.html never, so a deploy shows up at once.
 */
@Module({
  imports: existsSync(WEB_DIST)
    ? [
        ServeStaticModule.forRoot({
          rootPath: WEB_DIST,
          exclude: ['/api/{*path}'],
          serveStaticOptions: {
            setHeaders: (res: ServerResponse, path: string) => {
              res.setHeader(
                'Cache-Control',
                path.includes(`${join('dist', 'assets')}`)
                  ? 'public, max-age=31536000, immutable'
                  : 'no-cache',
              );
            },
          },
        }),
      ]
    : [],
})
export class WebAppModule {}
