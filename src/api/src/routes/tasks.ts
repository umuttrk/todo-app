// docs/specs/001-todo-olustur.md — API Contract: POST /api/tasks
import { Router } from 'express';
import { validateCreateTaskInput } from '../validation/task';
import { createTask } from '../services/taskService';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const input = validateCreateTaskInput(req.body);
    const task = await createTask(input);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

export default router;
