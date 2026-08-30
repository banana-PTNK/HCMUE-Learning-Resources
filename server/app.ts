import express from 'express';
import dotenv from 'dotenv';
import { corsAndSecurityMiddleware } from './middlewares/cors.middleware';
import { errorHandler } from './middlewares/error.middleware';
import apiRouter from './routes';

dotenv.config();

export function createApp() {
  const app = express();

  // Security hardening: disable x-powered-by header & add secure HTTP headers
  app.disable('x-powered-by');
  app.use(corsAndSecurityMiddleware);

  // Body parsers with generous limits for file/image uploads
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // Main API Router mounted on /api
  app.use('/api', apiRouter);

  // Central Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
