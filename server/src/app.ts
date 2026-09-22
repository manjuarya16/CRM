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
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger }));
  app.use(passport.initialize());

  // Static uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.use('/api', routes);


  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
