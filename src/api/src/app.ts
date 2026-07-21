import express from 'express';
import tasksRouter from './routes/tasks';
import tagsRouter from './routes/tags';
import { errorHandler } from './errorHandler';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/tasks', tasksRouter);
  app.use('/api/tags', tagsRouter);
  app.use(errorHandler);
  return app;
}
