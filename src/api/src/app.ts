import express from 'express';
import tasksRouter from './routes/tasks';
import { errorHandler } from './errorHandler';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/tasks', tasksRouter);
  app.use(errorHandler);
  return app;
}
