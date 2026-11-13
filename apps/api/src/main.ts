import 'reflect-metadata';
import {
  Module,
  Catch,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express from 'express';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Response } from 'express';
import { db } from '@zdaj/database';
import { ApiController } from './controller.js';
import { cleanupExpiredStudyChecks } from './study-checks.js';
import { cleanupExpiredSandboxRuns } from './sandbox-runs.js';
import { config, DAY_MS, projectRoot } from './config.js';

@Module({ controllers: [ApiController] })
class AppModule {}

@Catch()
class SafeErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = error instanceof HttpException ? error.getStatus() : 500;
    let message = 'Wystąpił błąd serwera. Twoje lokalne dane pozostały na urządzeniu.';
    if (error instanceof HttpException) {
      const detail = error.getResponse();
      message =
        typeof detail === 'string'
          ? detail
          : String((detail as { message?: unknown }).message ?? error.message);
    } else {
      console.error('[api] Request failed:', error instanceof Error ? error.name : 'UnknownError');
    }
    response.status(statusCode).json({ statusCode, message });
  }
}

export async function createApp(options: { webDist?: string } = {}) {
  const trustedProxySetting = process.env.TRUST_PROXY?.trim();
  if (trustedProxySetting?.toLowerCase() === 'true') {
    throw new Error(
      'TRUST_PROXY must be false or an explicit comma-separated list of trusted proxy addresses/CIDRs.',
    );
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const trustedProxies =
    trustedProxySetting && trustedProxySetting.toLowerCase() !== 'false'
      ? trustedProxySetting
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : false;
  app.set('trust proxy', trustedProxies);
  app.useBodyParser('json', { limit: '14mb' });
  app.use(cookieParser());
  app.use((_req: unknown, res: Response, next: () => void) => {
    res.locals.cspNonce = randomBytes(24).toString('base64');
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.SERVE_WEB === 'true'
          ? {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                  "'self'",
                  (_req, res) => `'nonce-${(res as Response).locals.cspNonce as string}'`,
                ],
                styleSrc: ["'self'", "'unsafe-inline'"],
                fontSrc: ["'self'", 'data:'],
                imgSrc: ["'self'", 'data:', 'blob:'],
                connectSrc: ["'self'"],
                frameSrc: ["'self'"],
                workerSrc: ["'self'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                frameAncestors: ["'none'"],
                upgradeInsecureRequests: config.production ? [] : null,
              },
            }
          : false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use((req: { path: string }, res: Response, next: () => void) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.useGlobalFilters(new SafeErrorFilter());
  if (process.env.SERVE_WEB === 'true') {
    const dist = options.webDist ?? join(projectRoot, 'apps', 'web', 'dist');
    const indexHtml = await readFile(join(dist, 'index.html'), 'utf8');
    const sendHtml = (res: Response) =>
      res.type('html').send(indexHtml.replaceAll('__CSP_NONCE__', res.locals.cspNonce as string));
    const server = app.getHttpAdapter().getInstance() as express.Express;
    server.get('/index.html', (_req, res) => {
      sendHtml(res);
    });
    const serveStatic = express.static(dist, { index: false });
    app.use((req: express.Request, res: Response, next: express.NextFunction) => {
      let path: string;
      try {
        path = decodeURIComponent(req.path).toLowerCase();
      } catch {
        res.status(400).end();
        return;
      }
      // HTML always passes through nonce injection, including encoded and case-varied paths.
      if (path.includes('.htm')) return next();
      serveStatic(req, res, next);
    });
    server.get('/{*splat}', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      sendHtml(res);
    });
  }
  app.enableShutdownHooks();
  return app;
}
async function cleanup() {
  const now = new Date();
  await Promise.all([
    cleanupExpiredStudyChecks(now),
    cleanupExpiredSandboxRuns(now),
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.attemptTicket.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.event.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 7 * DAY_MS) } } }),
  ]);
}

if (process.env.API_NO_LISTEN !== '1') {
  const app = await createApp();
  await app.listen(config.port, config.host);
  const timer = setInterval(() => {
    cleanup().catch(() => console.error('[api] Cleanup failed; will retry.'));
  }, 60_000);
  timer.unref();
  console.log(`Zdaj Egzamin INF API: http://${config.host}:${config.port}/api/v1`);
}
