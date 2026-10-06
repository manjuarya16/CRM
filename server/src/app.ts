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
        "X-Requested-With",
        "Accept",
        "Origin",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Headers",
      ],
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    pinoHttp({
      logger,
      customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
      customErrorMessage: (req, res, err) => `${req.method} ${req.url} ${res.statusCode} - ${err?.message || 'Error'}`,
      serializers: {
        req: () => undefined,
        res: () => undefined,
      },
    })
  );
  app.use(passport.initialize());

  // Static uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.use('/api', routes);


  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
