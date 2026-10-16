import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { passport } from '@/config/passport';
import routes from '@/routes';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';

import path from 'path';
import fs from 'fs';

export function createApp(): express.Express {
  const app = express();

  app.disable('etag');

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  
  const allowedOrigins = (env.CLIENT_ORIGIN || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        if (
          origin.startsWith("http://localhost") ||
          origin.startsWith("http://127.0.0.1") ||
          origin.startsWith("https://localhost") ||
          allowedOrigins.length === 0 ||
          allowedOrigins.includes(origin) ||
          allowedOrigins.includes("*")
        ) {
          return callback(null, true);
        }

        callback(null, true);
      },
      credentials: true,
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Authorization",
        "x-authorization",
        "X-Tenant-Slug",
        "x-tenant-slug",
        "X-Requested-With",
        "Accept",
        "Origin",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Headers",
      ],
    })
  );
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(
    pinoHttp({
      logger,
      customSuccessMessage: (req, res) => `${req.method} ${(req as any).originalUrl || req.url} ${res.statusCode}`,
      customErrorMessage: (req, res, err) => `${req.method} ${(req as any).originalUrl || req.url} ${res.statusCode} - ${err?.message || 'Error'}`,
      serializers: {
        req: () => undefined,
        res: () => undefined,
      },
    })
  );
  app.use(passport.initialize());

  // Static uploads directory with auto-fallback to production storage
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  app.use('/uploads', async (req, res, next) => {
    try {
      const remoteUrl = `https://crmsrv.imorse.digital/uploads${req.url}`;
      const response = await fetch(remoteUrl);
      if (response.ok) {
        const localFile = path.join(process.cwd(), 'uploads', req.path.replace(/^\//, ''));
        const buf = Buffer.from(await response.arrayBuffer());
        fs.mkdirSync(path.dirname(localFile), { recursive: true });
        fs.writeFileSync(localFile, buf);
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        return res.send(buf);
      }
    } catch {
      // Fall through to not found handler
    }
    next();
  });

  app.use('/api', routes);


  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
